name: skill-registry
version: 1.0
description: "Project-local SDD skill registry for SIGMUN"
skills:
  - name: sdd-init
    trigger: initialize SDD context
    description: "Initialize project SDD persistence, detect stack, and save testing capabilities"
    path: "/c/Users/jmozo.SATICA/.claude/skills/sdd-init/SKILL.md"
  - name: sdd-explore
    trigger: explore project architecture or feature changes
    description: "Examine codebase structure and gather context for new SDD work"
    path: "/c/Users/jmozo.SATICA/.claude/skills/sdd-explore/SKILL.md"
  - name: sdd-propose
    trigger: create SDD proposal
    description: "Draft proposal with scope, goals, constraints, and approach"
    path: "/c/Users/jmozo.SATICA/.claude/skills/sdd-propose/SKILL.md"
  - name: sdd-spec
    trigger: write SDD specification
    description: "Write detailed acceptance criteria, success, and non-goals"
    path: "/c/Users/jmozo.SATICA/.claude/skills/sdd-spec/SKILL.md"
  - name: sdd-design
    trigger: define architecture and design decisions
    description: "Capture system design, APIs, and component interactions"
    path: "/c/Users/jmozo.SATICA/.claude/skills/sdd-design/SKILL.md"
  - name: sdd-tasks
    trigger: break spec into implementation tasks
    description: "Generate task list and review workload forecast"
    path: "/c/Users/jmozo.SATICA/.claude/skills/sdd-tasks/SKILL.md"
  - name: sdd-apply
    trigger: implement SDD tasks
    description: "Apply the planned changes and persist apply-progress"
    path: "/c/Users/jmozo.SATICA/.claude/skills/sdd-apply/SKILL.md"
  - name: sdd-verify
    trigger: verify SDD implementation against spec
    description: "Run validation, tests, and confirm acceptance criteria"
    path: "/c/Users/jmozo.SATICA/.claude/skills/sdd-verify/SKILL.md"
  - name: sdd-archive
    trigger: archive completed SDD work
    description: "Close the change and persist final state"
    path: "/c/Users/jmozo.SATICA/.claude/skills/sdd-archive/SKILL.md"
