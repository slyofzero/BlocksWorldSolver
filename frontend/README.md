# Blocks World RL Trajectory Visualizer (Next.js)

An interactive, dark-mode web application to inspect, debug, and scrub through recorded reinforcement learning policy trajectories (PPO / Policy Gradient / GRPO) in a STRIPS-style Blocks World environment.

## Features

- **Automatic Training Run Discovery**: Dynamically scans `training_runs/train_*/diagnostics.json` and loads trajectories directly from the `"traj_histories"` key.
- **Fast In-Memory Caching & Sub-millisecond Serving**: Evaluates large diagnostics files (10,000+ episodes) on the backend without freezing the browser.
- **Interactive Episode Browser**: Browse through all recorded episodes with filters for high rewards / successes, episode jump, and return metrics.
- **2D Visual Layout & Column Stability**:
  - Automatically reconstructs discrete stacks from `onTable(X)` and `on(child, parent)` predicates.
  - Column stability tracking preserves stack horizontal positions across timesteps so blocks do not jump horizontally.
  - Toggle between **Stable Columns** and **Compact Columns**.
- **Overhead Robotic Gantry & Claw Gripper**:
  - Gantry trolley smoothly travels along an overhead rail to the active stack column.
  - Dual articulated gripper claws open when `armempty` and clamp onto the block when `holding(X)`.
- **Inspector & Action Diagnostics**:
  - Displays current action: `pickup(X)`, `putdown(X)`, `stack(X, Y)`, `unstack(X, Y)` (auto-inferred if not pre-labeled).
  - **State Transitions Diff**: Highlights added predicates in green (`+`) and removed predicates in red (`-`).
  - Active predicates listing with filter tabs (Stacking, Table, Clear, Arm) and search.
  - Interactive block hover: hovering over any block outlines it and highlights all predicates mentioning it.
- **Trajectory Timeline & Step Scrubber**:
  - Full-range step scrubber with live percentage progress.
  - Bottom scrollable timeline with jumpable action buttons.
  - Playback controls: First, Prev, Play/Pause, Next, Last, speed selector (0.25x to 4x), and loop toggle.
- **Local File Uploader**:
  - Load any local `trajectories.json` or `diagnostics.json` file offline.

## Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `←` | Previous step in trajectory |
| `→` | Next step in trajectory |
| `Space` | Toggle Play / Pause auto-playback |
| `Home` | Jump to First step (0) |
| `End` | Jump to Last step (T - 1) |
| `L` | Toggle Loop playback mode |
| `?` | Open Keyboard Shortcuts help modal |
| `Esc` | Close any modal |

## Getting Started

From the `frontend` directory:

```bash
# Install dependencies
bun install   # or npm install

# Run the development server
bun dev       # or npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
