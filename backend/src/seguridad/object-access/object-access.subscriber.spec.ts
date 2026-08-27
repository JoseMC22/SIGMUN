/// <reference types="jest" />

import { ObjectAccessSubscriber } from './object-access.subscriber';
import { MessageEvent } from '@nestjs/common';

type MessageHandler = (channel: string, message: string) => void;

// ─── Helper to create a mock ioredis instance ───
function createMockRedis() {
  const listeners: Record<string, MessageHandler[]> = {};
  const mock = {
    subscribe: jest.fn().mockResolvedValue(undefined),
    unsubscribe: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    on: jest.fn((event: string, handler: MessageHandler) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
      return mock;
    }),
    removeListener: jest.fn((event: string, handler: MessageHandler) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((h) => h !== handler);
      }
      return mock;
    }),
    // Expose for test convenience
    __emit: (event: string, channel: string, message: string) => {
      (listeners[event] ?? []).forEach((h) => h(channel, message));
    },
  };
  return mock;
}

describe('ObjectAccessSubscriber', () => {
  let subscriber: ObjectAccessSubscriber;
  let mockRedis: ReturnType<typeof createMockRedis>;
  let redisFactory: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockRedis = createMockRedis();
    redisFactory = jest.fn().mockReturnValue(mockRedis);
    subscriber = new ObjectAccessSubscriber(redisFactory);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getObservable', () => {
    it('should subscribe to the correct Redis channel for the given username', () => {
      const sub = subscriber.getObservable('alice').subscribe();
      sub.unsubscribe();

      expect(mockRedis.subscribe).toHaveBeenCalledWith(
        'access:changed:alice',
      );
    });

    it('should return an rxjs Observable', () => {
      const obs = subscriber.getObservable('alice');

      expect(obs).toBeDefined();
      expect(typeof obs.subscribe).toBe('function');
    });

    it('should reuse the same Redis connection for the same username', () => {
      const sub1 = subscriber.getObservable('alice').subscribe();
      const sub2 = subscriber.getObservable('alice').subscribe();
      sub1.unsubscribe();
      sub2.unsubscribe();

      // redisFactory called once per unique username
      expect(redisFactory).toHaveBeenCalledTimes(1);
      expect(mockRedis.subscribe).toHaveBeenCalledTimes(1);
    });

    it('should create separate connections for different usernames', () => {
      const mockRedis2 = createMockRedis();
      redisFactory
        .mockReturnValueOnce(mockRedis)
        .mockReturnValueOnce(mockRedis2);

      const sub1 = subscriber.getObservable('alice').subscribe();
      const sub2 = subscriber.getObservable('bob').subscribe();
      sub1.unsubscribe();
      sub2.unsubscribe();

      expect(redisFactory).toHaveBeenCalledTimes(2);
    });
  });

  describe('message handling', () => {
    it('should emit a MessageEvent when a Redis message arrives', (done) => {
      subscriber.getObservable('alice').subscribe((event: MessageEvent) => {
        expect(event.type).toBe('access:invalidated');
        expect(event.data).toEqual({ id_acceso: 42 });
        done();
      });

      // Simulate Redis message via the registered listener
      mockRedis.__emit(
        'message',
        'access:changed:alice',
        JSON.stringify({ id_acceso: 42 }),
      );
    });

    it('should ignore messages for other channels', () => {
      const received: MessageEvent[] = [];
      subscriber.getObservable('alice').subscribe((event) => {
        received.push(event);
      });

      // Message on a different channel
      mockRedis.__emit(
        'message',
        'access:changed:bob',
        JSON.stringify({ id_acceso: 42 }),
      );

      expect(received).toHaveLength(0);
    });

    it('should handle malformed JSON gracefully', () => {
      const received: MessageEvent[] = [];
      const errors: any[] = [];
      subscriber.getObservable('alice').subscribe({
        next: (event) => received.push(event),
        error: (err) => errors.push(err),
      });

      mockRedis.__emit('message', 'access:changed:alice', 'not-json');

      // Should not emit or error — malformed messages are silently ignored
      expect(received).toHaveLength(0);
      expect(errors).toHaveLength(0);
    });
  });

  describe('cleanup on destroy', () => {
    it('should unsubscribe from Redis channel when all subscribers are gone', () => {
      const obs = subscriber.getObservable('alice');
      const sub1 = obs.subscribe();
      const sub2 = obs.subscribe();

      sub1.unsubscribe();
      // Still one subscriber left — should NOT unsubscribe yet
      expect(mockRedis.unsubscribe).not.toHaveBeenCalled();

      sub2.unsubscribe();
      // All subscribers gone — should unsubscribe
      expect(mockRedis.unsubscribe).toHaveBeenCalledWith(
        'access:changed:alice',
      );
    });

    it('should quit Redis connection on unsubscribe', () => {
      const obs = subscriber.getObservable('alice');
      const sub = obs.subscribe();
      sub.unsubscribe();

      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('should clean up all connections on destroy', () => {
      const mockRedis2 = createMockRedis();
      redisFactory
        .mockReturnValueOnce(mockRedis)
        .mockReturnValueOnce(mockRedis2);

      subscriber.getObservable('alice').subscribe();
      subscriber.getObservable('bob').subscribe();

      subscriber.destroyAll();

      expect(mockRedis.quit).toHaveBeenCalled();
      expect(mockRedis2.quit).toHaveBeenCalled();
    });
  });

  describe('heartbeat', () => {
    it('should emit keepalive comments every 30 seconds', () => {
      const received: MessageEvent[] = [];
      subscriber.getObservable('alice').subscribe((event) => {
        received.push(event);
      });

      // Advance 30 seconds
      jest.advanceTimersByTime(30000);

      // The keepalive uses type '' per NestJS SSE convention
      const keepalives = received.filter((e) => e.type === '');
      expect(keepalives.length).toBe(1);
    });

    it('should send multiple keepalives over time', () => {
      const received: MessageEvent[] = [];
      subscriber.getObservable('alice').subscribe((event) => {
        received.push(event);
      });

      jest.advanceTimersByTime(90000); // 90 seconds = 3 keepalives

      const keepalives = received.filter((e) => e.type === '');
      expect(keepalives.length).toBe(3);
    });

    it('should stop heartbeat when subscriber unsubscribes', () => {
      const received: MessageEvent[] = [];
      const sub = subscriber.getObservable('alice').subscribe((event) => {
        received.push(event);
      });

      jest.advanceTimersByTime(30000); // 1 keepalive
      sub.unsubscribe();
      received.length = 0;

      jest.advanceTimersByTime(60000); // 2 more intervals — should not emit

      const keepalives = received.filter((e) => e.type === '');
      expect(keepalives).toHaveLength(0);
    });
  });

  describe('when Redis is unavailable (null factory)', () => {
    let noRedisSubscriber: ObjectAccessSubscriber;

    beforeEach(() => {
      jest.clearAllMocks();
      jest.useFakeTimers();
      // Factory returns null → no Redis client should ever be created
      noRedisSubscriber = new ObjectAccessSubscriber(() => null);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should not throw and should not call any Redis method', () => {
      const received: MessageEvent[] = [];
      const sub = noRedisSubscriber.getObservable('alice').subscribe((e) => {
        received.push(e);
      });

      // Advance timers — only keepalive heartbeats should arrive
      jest.advanceTimersByTime(30000);
      const keepalives = received.filter((e) => e.type === '');
      expect(keepalives.length).toBe(1);

      expect(() => sub.unsubscribe()).not.toThrow();
    });

    it('should still emit keepalive heartbeats over time', () => {
      const received: MessageEvent[] = [];
      const sub = noRedisSubscriber.getObservable('alice').subscribe((e) => {
        received.push(e);
      });

      jest.advanceTimersByTime(90000); // 90 seconds = 3 keepalives

      const keepalives = received.filter((e) => e.type === '');
      expect(keepalives.length).toBe(3);

      sub.unsubscribe();
    });
  });
});
