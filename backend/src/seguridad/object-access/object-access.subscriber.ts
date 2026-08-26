import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subscriber as RxSubscriber } from 'rxjs';
import Redis from 'ioredis';
import { MessageEvent } from '@nestjs/common';

const KEEPALIVE_INTERVAL_MS = 30_000;

@Injectable()
export class ObjectAccessSubscriber {
  private readonly logger = new Logger(ObjectAccessSubscriber.name);
  private connections = new Map<string, Redis>();
  private refCounts = new Map<string, number>();
  private keepaliveTimers = new Map<string, ReturnType<typeof setInterval>>();

  constructor(private readonly redisFactory: () => Redis | null) {}

  getObservable(username: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((observer) => {
      let redis = this.connections.get(username);

      if (!redis) {
        const created = this.redisFactory();

        // No Redis available (REDIS_URL not set) — run keepalive-only mode so
        // the SSE stream stays open without a real Pub/Sub connection.
        if (!created) {
          const timer = setInterval(() => {
            observer.next({ type: '', data: '' });
          }, KEEPALIVE_INTERVAL_MS);
          return () => clearInterval(timer);
        }

        redis = created;
        this.connections.set(username, redis);

        const channel = `access:changed:${username}`;
        redis.subscribe(channel);
      }

      // Increment ref count
      this.refCounts.set(
        username,
        (this.refCounts.get(username) ?? 0) + 1,
      );

      // Listen for messages
      const messageHandler = (channel: string, message: string) => {
        if (channel !== `access:changed:${username}`) return;
        try {
          const data = JSON.parse(message);
          observer.next({
            type: 'access:invalidated',
            data,
          });
        } catch {
          this.logger.warn(
            `Malformed message on channel ${channel}: ${message}`,
          );
        }
      };

      const conn = redis!;
      conn.on('message', messageHandler);

      // Start heartbeat
      const timer = setInterval(() => {
        observer.next({ type: '', data: '' });
      }, KEEPALIVE_INTERVAL_MS);
      this.keepaliveTimers.set(username, timer);

      // Teardown on unsubscribe
      return () => {
        clearInterval(timer);
        this.keepaliveTimers.delete(username);

        const count = (this.refCounts.get(username) ?? 1) - 1;
        this.refCounts.set(username, count);

        if (count <= 0) {
          conn.removeListener('message', messageHandler);
          conn.unsubscribe(`access:changed:${username}`);
          conn.quit();
          this.connections.delete(username);
          this.refCounts.delete(username);
        } else {
          conn.removeListener('message', messageHandler);
        }
      };
    });
  }

  destroyAll(): void {
    for (const [username, redis] of this.connections) {
      const timer = this.keepaliveTimers.get(username);
      if (timer) clearInterval(timer);
      redis.quit();
    }
    this.connections.clear();
    this.refCounts.clear();
    this.keepaliveTimers.clear();
  }
}
