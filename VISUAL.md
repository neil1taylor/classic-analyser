# IBM Cloud Infrastructure Explorer
# Visual Design Recommendations

---

| | |
|---|---|
| **Document Type** | Visual Design Specifications |
| **Date** | January 28, 2025 |
| **Related Document** | IBM Cloud Infrastructure Explorer PRD v1.0 |
| **Purpose** | Guidelines for creating a visually impressive, professional interface |

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Dashboard Hero Metrics](#2-dashboard-hero-metrics)
3. [Infrastructure Topology Visualisation](#3-infrastructure-topology-visualisation)
4. [Cost Visualisations](#4-cost-visualisations)
5. [Resource Distribution Charts](#5-resource-distribution-charts)
6. [Geographic Visualisation](#6-geographic-visualisation)
7. [Collection Progress Animation](#7-collection-progress-animation)
8. [Resource Cards & Sparklines](#8-resource-cards--sparklines)
9. [Data Tables Enhancement](#9-data-tables-enhancement)
10. [Micro-Interactions & Animations](#10-micro-interactions--animations)
11. [Dark Mode Support](#11-dark-mode-support)
12. [Recommended Technology Stack](#12-recommended-technology-stack)
13. [Implementation Roadmap](#13-implementation-roadmap)
14. [Appendix: Code Examples](#14-appendix-code-examples)

---

## 1. Design Philosophy

### 1.1 Core Principles

The visual design should embody three key principles:

**Professional & Enterprise-Ready**
- IBM Carbon Design System as the foundation
- Clean, uncluttered layouts
- Consistent spacing and typography
- Appropriate for client-facing demonstrations

**Data-Dense Yet Readable**
- Maximum information without overwhelming
- Visual hierarchy guides the eye
- Progressive disclosure of detail
- Effective use of whitespace

**Dynamic & Responsive**
- Smooth animations provide feedback
- Real-time updates feel alive
- Interactions are intuitive
- Performance remains snappy

### 1.2 Visual Identity

**Colour Strategy:**

| Purpose | Light Mode | Dark Mode | Usage |
|---------|------------|-----------|-------|
| Primary Action | `#0f62fe` (Blue 60) | `#78a9ff` (Blue 40) | Buttons, links, primary charts |
| Success | `#24a148` (Green 50) | `#42be65` (Green 40) | Running status, positive metrics |
| Warning | `#f1c21b` (Yellow 30) | `#f1c21b` (Yellow 30) | Warnings, attention needed |
| Error | `#da1e28` (Red 60) | `#fa4d56` (Red 50) | Errors, critical status |
| Info | `#0043ce` (Blue 70) | `#4589ff` (Blue 50) | Informational elements |
| Neutral | `#525252` (Gray 70) | `#a8a8a8` (Gray 40) | Secondary text, borders |

**Chart Colour Palette:**

For data visualisations, use the IBM categorical colour palette:

```
Primary Series:   #6929c4  #1192e8  #005d5d  #9f1853  #fa4d56
Secondary Series: #570408  #198038  #002d9c  #ee538b  #b28600
Tertiary Series:  #009d9a  #012749  #8a3800  #a56eff  #d12771
```

### 1.3 Typography for Data

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| Dashboard Metric | IBM Plex Sans | 48px | 600 | 1.1 |
| Metric Label | IBM Plex Sans | 14px | 400 | 1.4 |
| Chart Title | IBM Plex Sans | 16px | 600 | 1.25 |
| Chart Label | IBM Plex Sans | 12px | 400 | 1.3 |
| Table Header | IBM Plex Sans | 14px | 600 | 1.4 |
| Table Cell | IBM Plex Sans | 14px | 400 | 1.4 |
| Code/Technical | IBM Plex Mono | 13px | 400 | 1.5 |

---

## 2. Dashboard Hero Metrics

### 2.1 Animated Counter Cards

Replace static number tiles with dynamic, animated metric cards that convey trends and status at a glance.

**Visual Specification:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐      │
│   │                   │  │                   │  │                   │      │
│   │        45         │  │         8         │  │     $12,450       │      │
│   │      ▲ +3         │  │      ● stable     │  │      ▼ -$200      │      │
│   │                   │  │                   │  │                   │      │
│   │  Virtual Servers  │  │   Bare Metal      │  │   Monthly Cost    │      │
│   │                   │  │                   │  │                   │      │
│   │  ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁  │  │  ▅▅▅▅▅▅▅▅▅▅▅▅▅▅  │  │  █▇▆▅▄▃▂▁▂▃▄▅▆▇  │      │
│   │                   │  │                   │  │                   │      │
│   │  12 dal13 │ 8 wdc │  │  5 dal13 │ 3 wdc │  │  avg: $11,800     │      │
│   └───────────────────┘  └───────────────────┘  └───────────────────┘      │
│                                                                             │
│   ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐      │
│   │                   │  │                   │  │                   │      │
│   │        12         │  │        24         │  │       4.5 TB      │      │
│   │      ▲ +2         │  │      ▲ +4         │  │      ▲ +500GB     │      │
│   │                   │  │                   │  │                   │      │
│   │      VLANs        │  │     Subnets       │  │   Total Storage   │      │
│   │                   │  │                   │  │                   │      │
│   │  ▁▁▂▂▃▃▄▄▅▅▆▆▇▇██  │  │  ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁  │  │  ▁▂▃▄▅▆▇████████  │      │
│   │                   │  │                   │  │                   │      │
│   │  6 pub │ 6 priv   │  │  18 primary       │  │  Block: 3TB       │      │
│   └───────────────────┘  └───────────────────┘  └───────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Card Anatomy:**

```
┌─────────────────────────────────────┐
│                                     │  ← Container: 200px × 160px
│            45                       │  ← Primary Metric: 48px, Bold
│          ▲ +3                       │  ← Trend Indicator: 14px, Coloured
│                                     │
│     Virtual Servers                 │  ← Label: 14px, Gray 60
│                                     │
│    ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁                  │  ← Sparkline: 30px height
│                                     │
│    12 dal13 │ 8 wdc07               │  ← Sub-metrics: 12px, Gray 50
└─────────────────────────────────────┘
```

**Interaction States:**

| State | Visual Treatment |
|-------|------------------|
| Default | White background, subtle shadow |
| Hover | Elevated shadow, slight scale (1.02) |
| Loading | Skeleton animation, pulsing |
| Error | Red border, error icon |
| Stale Data | Yellow border, warning icon, "Last updated: 5m ago" |

### 2.2 Sparkline Specifications

**Mini Area Chart:**

```typescript
interface SparklineConfig {
  width: 140;
  height: 30;
  strokeWidth: 2;
  fillOpacity: 0.1;
  color: string; // Based on trend direction
  dataPoints: 14; // Two weeks of daily data
  showEndDot: true;
  animation: {
    duration: 1000;
    easing: 'easeOutCubic';
  };
}
```

**Colour Logic:**

```typescript
function getSparklineColor(trend: number): string {
  if (trend > 0.05) return '#24a148';  // Green - growth
  if (trend < -0.05) return '#da1e28'; // Red - decline
  return '#0f62fe';                     // Blue - stable
}
```

### 2.3 Animated Number Counter

Numbers should animate when they change, creating a sense of live data.

**Animation Specification:**

```typescript
interface CounterAnimation {
  duration: 1500; // ms
  easing: 'easeOutExpo';
  separator: ',';
  decimal: '.';
  prefix?: '$';
  suffix?: '/mo';
  startOnVisible: true;
}
```

**Implementation Example:**

```tsx
import { useSpring, animated } from '@react-spring/web';

function AnimatedCounter({ value, prefix = '', suffix = '' }) {
  const { number } = useSpring({
    from: { number: 0 },
    to: { number: value },
    delay: 200,
    config: { duration: 1500, easing: t => 1 - Math.pow(1 - t, 3) },
  });

  return (
    <animated.span>
      {number.to(n => `${prefix}${n.toFixed(0).toLocaleString()}${suffix}`)}
    </animated.span>
  );
}
```

---

## 3. Infrastructure Topology Visualisation

### 3.1 Overview

The topology diagram is the **signature feature** that will differentiate this tool. It provides an intuitive visual representation of how infrastructure components are connected.

### 3.2 Network Diagram Layout

**Hierarchical Layout (Default):**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Infrastructure Topology                    [dal13 ▼]  [Layers ▼]  [⛶ 🔍]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              ┌─────────────┐                                │
│                              │  ☁ Internet │                                │
│                              └──────┬──────┘                                │
│                                     │                                       │
│                              ┌──────┴──────┐                                │
│                              │   Gateway   │                                │
│                              │   gw-dal13  │                                │
│                              │ ◈ 169.x.x.1 │                                │
│                              └──────┬──────┘                                │
│                       ┌─────────────┴─────────────┐                         │
│                       │                           │                         │
│                ┌──────┴──────┐             ┌──────┴──────┐                  │
│                │ VLAN 1234   │             │ VLAN 1235   │                  │
│                │ Public      │             │ Private     │                  │
│                │ 10.0.0.0/24 │             │ 10.1.0.0/24 │                  │
│                └──────┬──────┘             └──────┬──────┘                  │
│                       │                           │                         │
│         ┌─────────────┼─────────────┐    ┌───────┴───────┐                 │
│         │             │             │    │               │                 │
│     ┌───┴───┐     ┌───┴───┐     ┌───┴───┐           ┌───┴───┐             │
│     │web-1  │     │web-2  │     │web-3  │           │ db-1  │             │
│     │ ○ 4C  │────▶│ ○ 4C  │────▶│ ○ 4C  │           │ ■ 16C │             │
│     │  8GB  │     │  8GB  │     │  8GB  │           │  64GB │             │
│     └───┬───┘     └───┬───┘     └───┬───┘           └───┬───┘             │
│         │             │             │                   │                 │
│         └─────────────┴─────────────┴───────────────────┘                 │
│                                     │                                       │
│                              ┌──────┴──────┐                                │
│                              │    ◆ SAN    │                                │
│                              │   2.5 TB    │                                │
│                              │ Block Store │                                │
│                              └─────────────┘                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Legend:  ○ VSI   ■ Bare Metal   ◆ Storage   ◈ Gateway   ═ Firewall │   │
│  │          ─── Network Link   ••• Storage Link   ▸▸▸ Traffic Flow    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Node Design Specifications

**VSI Node:**

```
┌─────────────────┐
│    ┌─────┐      │   Status indicator (coloured dot)
│    │ ● ○ │      │   ● Green = Running
│    └─────┘      │   ○ Gray = Stopped
│                 │   ◐ Yellow = Transitioning
│   web-prod-1    │   Hostname (14px, semibold)
│                 │
│   4C  │  8GB    │   Resources (12px, gray)
│                 │
│   ▁▂▃▅▆▇█▇▅▃    │   Optional: Mini CPU sparkline
│                 │
│   10.1.1.5      │   IP Address (12px, mono)
└─────────────────┘

Dimensions: 120px × 100px
Border Radius: 8px
Background: White (light) / Gray 90 (dark)
Border: 1px Gray 30 (light) / Gray 70 (dark)
Shadow: 0 2px 6px rgba(0,0,0,0.1)
```

**Bare Metal Node:**

```
┌─────────────────┐
│ ■■■■■■■■■■■■■■■ │   Visual differentiation (solid bar)
│                 │
│   db-prod-1     │
│                 │
│  16C  │  64GB   │
│                 │
│   4× 1TB SSD    │   Hardware details
│                 │
│   10.1.2.10     │
└─────────────────┘

Dimensions: 120px × 110px
Header: Blue 60 background strip
```

**Storage Node:**

```
    ╭─────────────╮
   ╱             ╱│
  ╱─────────────╱ │    3D cylinder effect
  │             │ │
  │  ◆ vol-001  │ │
  │             │╱
  │   500 GB    │
  │   Block     │
  │             │
  ╰─────────────╯

Dimensions: 100px × 90px
Gradient: Blue 10 to Blue 20
```

**Gateway Node:**

```
      ╱╲
     ╱  ╲
    ╱    ╲
   ╱  ◈   ╲        Diamond shape
  ╱        ╲
 ╱ gw-dal13 ╲
╱            ╲
──────────────

Dimensions: 100px × 80px
Background: Gradient purple
```

### 3.4 Connection Lines

**Line Types:**

| Connection | Style | Colour | Animation |
|------------|-------|--------|-----------|
| Network (active) | Solid, 2px | Blue 60 | Flowing dots |
| Network (inactive) | Dashed, 1px | Gray 40 | None |
| Storage | Dotted, 2px | Purple 50 | None |
| Traffic flow | Animated | Green 40 | Particles moving |
| Dependency | Curved, 1px | Gray 30 | None |

**Animated Traffic Flow:**

```css
.traffic-line {
  stroke-dasharray: 5, 5;
  animation: flow 1s linear infinite;
}

@keyframes flow {
  to {
    stroke-dashoffset: -10;
  }
}
```

### 3.5 Interaction Behaviours

**Node Hover:**
- Highlight node with glow effect
- Show tooltip with full details
- Dim unconnected nodes (focus mode)
- Highlight connected edges

**Node Click:**
- Open detail panel on right
- Center and zoom to node
- Show related resources

**Pan & Zoom:**
- Mouse drag to pan
- Scroll wheel to zoom
- Pinch gesture on touch
- Minimap in corner
- Fit-to-screen button

**Filtering:**

```
┌─────────────────────────────────────────────┐
│  Layers                                     │
│  ┌────────────────────────────────────────┐ │
│  │ ☑ Virtual Servers                      │ │
│  │ ☑ Bare Metal                           │ │
│  │ ☑ Gateways                             │ │
│  │ ☑ VLANs                                │ │
│  │ ☐ Storage Connections                  │ │
│  │ ☐ Security Groups                      │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 3.6 Layout Algorithms

**Available Layouts:**

| Layout | Use Case | Algorithm |
|--------|----------|-----------|
| Hierarchical | Default, shows tiers | Dagre |
| Force-Directed | Organic clustering | D3-force |
| Circular | VLAN-centric view | Custom |
| Grid | Dense inventory | Auto-grid |

**Layout Switching:**

```
┌────────────────────────────────┐
│  Layout: [Hierarchical ▼]      │
│  ├─ Hierarchical (default)     │
│  ├─ Force-Directed             │
│  ├─ Circular                   │
│  └─ Grid                       │
└────────────────────────────────┘
```

---

## 4. Cost Visualisations

### 4.1 Treemap Chart

A treemap provides an intuitive view of where money is being spent, with area proportional to cost.

**Visual Specification:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Monthly Cost Breakdown                                   Total: $12,450    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────┬───────────────────┬─────────┐ │
│  │                                         │                   │         │ │
│  │                                         │                   │  File   │ │
│  │         Bare Metal Servers              │    Virtual        │ Storage │ │
│  │              $4,800                     │    Servers        │  $800   │ │
│  │                                         │    $3,200         │         │ │
│  │   ┌───────────────┬───────────────┐     │                   ├─────────┤ │
│  │   │               │               │     │  ┌──────┬───────┐ │         │ │
│  │   │    db-1       │    db-2       │     │  │ web  │  app  │ │ Network │ │
│  │   │   $1,200      │   $1,200      │     │  │ $800 │$1,200 │ │  $600   │ │
│  │   │               │               │     │  ├──────┴───────┤ │         │ │
│  │   ├───────────────┼───────────────┤     │  │   dev/test   │ │         │ │
│  │   │    app-1      │    app-2      │     │  │    $1,200    │ │         │ │
│  │   │   $1,200      │   $1,200      │     │  └──────────────┘ │         │ │
│  │   │               │               │     │                   │         │ │
│  │   └───────────────┴───────────────┘     │                   │         │ │
│  │                                         │                   │         │ │
│  ├─────────────────────────────────────────┴───────────────────┴─────────┤ │
│  │                          Block Storage                                 │ │
│  │                            $2,200                                      │ │
│  │   ┌────────────────┬────────────────┬────────────────┬──────────────┐ │ │
│  │   │   vol-001      │   vol-002      │   vol-003      │   vol-004    │ │ │
│  │   │    $600        │    $600        │    $500        │    $500      │ │ │
│  │   └────────────────┴────────────────┴────────────────┴──────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Hover for details │ Click to drill down │ Right-click for actions          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Colour Coding Options:**

| Mode | Description |
|------|-------------|
| By Type | Each resource type has a distinct colour |
| By Datacenter | Colour indicates location |
| By Cost Trend | Green (decreasing) to Red (increasing) |
| By Utilisation | Blue gradient based on usage |

**Interaction:**

- **Hover:** Show tooltip with resource details and percentage of total
- **Click:** Drill down into that category
- **Right-click:** Context menu (View Details, Export, Compare)
- **Breadcrumb:** Navigate back through drill-down levels

### 4.2 Sunburst Chart

For hierarchical cost drill-down: Datacenter → Resource Type → Individual Resource.

**Visual Specification:**

```
                         Monthly Cost by Hierarchy
                         
                              ┌─────────┐
                             ╱           ╲
                           ╱   $12,450    ╲
                         ╱      Total      ╲
                       ╱                     ╲
                     ╱  ┌─────────────────┐   ╲
                   ╱   ╱                   ╲    ╲
                 ╱    ╱    dal13: $7,500    ╲     ╲
               ╱     │  ┌───────┬───────┐   │      ╲
              │      │  │Compute│Storage│   │       │
              │      │  │$5,200 │$2,300 │   │       │
              │      │  ├───┬───┼───┬───┤   │       │
              │      │  │BM │VSI│Blk│Fil│   │       │
              │      │  │$3K│$2K│$2K│$0.3│  │       │
               ╲     │  └───┴───┴───┴───┘   │      ╱
                 ╲    ╲                    ╱     ╱
                   ╲   ╲   wdc07: $3,200  ╱    ╱
                     ╲  └───────────────┘   ╱
                       ╲                  ╱
                         ╲   lon06      ╱
                           ╲  $1,750  ╱
                             ╲      ╱
                              ╲────╱
                              
          Click segment to drill down │ Center shows current level
```

**Implementation Notes:**

- Use D3.js for sunburst (not available in Carbon Charts)
- Animate transitions when drilling down
- Show breadcrumb trail for navigation
- Center displays current selection details

### 4.3 Cost Trend Line Chart

Show cost over time with forecast.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Cost Trend                                        [6M ▼]  [Monthly ▼]      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  $15K ┤                                                                     │
│       │                                            ╭╴╴╴╴╴╴╴╴ Forecast       │
│       │                                      ●────╯                         │
│  $12K ┤                              ●──────●                               │
│       │                      ●──────●                                       │
│       │              ●──────●                                               │
│   $9K ┤      ●──────●                                                       │
│       │  ●───●                                                              │
│       │                                                                     │
│   $6K ┤                                                                     │
│       │                                                                     │
│       └────────┬────────┬────────┬────────┬────────┬────────┬────────┬─────│
│              Aug      Sep      Oct      Nov      Dec      Jan      Feb     │
│                                                                             │
│  ── Actual Cost    ╴╴ Forecast    ░░ Budget                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Cost Comparison Bar Chart

Compare costs across dimensions.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Cost by Datacenter                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  dal13  ████████████████████████████████████████████████████████  $7,500   │
│                                                                             │
│  wdc07  ██████████████████████████████                              $3,200   │
│                                                                             │
│  lon06  ██████████████                                              $1,750   │
│                                                                             │
│                                                                             │
│         $0        $2K        $4K        $6K        $8K                      │
│                                                                             │
│  ███ Compute    ███ Storage    ███ Network                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Resource Distribution Charts

### 5.1 Donut Charts with Centre Stats

Donut charts provide clean categorical breakdowns with the centre used for summary stats.

**Visual Specification:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Resource Distribution                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│     By Operating System          By Datacenter           By CPU Allocation  │
│                                                                             │
│         ╭─────────╮               ╭─────────╮               ╭─────────╮     │
│        ╱ ████░░░░░ ╲             ╱ ████████░ ╲             ╱ ██░░░░░░░ ╲    │
│       │ ██       ░░ │           │ ████     ░░ │           │ ████     ░░ │   │
│       │ ██   45    ░│           │ ████  53   ░│           │ ████  53   ░│   │
│       │ ██ servers ░│           │ ██ servers ░│           │ ██ servers ░│   │
│       │ ██       ░░ │           │ ████     ░░ │           │ ████████ ░░ │   │
│        ╲ ████░░░░░ ╱             ╲ ████████░ ╱             ╲ ████████░░ ╱    │
│         ╰─────────╯               ╰─────────╯               ╰─────────╯     │
│                                                                             │
│     ● RHEL 8    40%            ● dal13    56%            ● 2 vCPU    15%   │
│     ● Ubuntu    25%            ● wdc07    28%            ● 4 vCPU    35%   │
│     ● Windows   20%            ● lon06    10%            ● 8 vCPU    30%   │
│     ● CentOS    15%            ● tok05     6%            ● 16 vCPU   20%   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Design Specifications:**

| Property | Value |
|----------|-------|
| Outer Radius | 80px |
| Inner Radius | 50px (62.5% of outer) |
| Stroke Width | 0 |
| Segment Spacing | 2px |
| Animation | Segments grow from 0° |
| Hover | Segment expands slightly, tooltip |

**Centre Content:**

```tsx
<text className="donut-center-value">45</text>
<text className="donut-center-label">servers</text>
```

### 5.2 Stacked Bar Chart

For showing composition across categories.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Servers by Datacenter and Type                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  dal13  ████████████████████████░░░░░░░░░░░░░                         25   │
│                                                                             │
│  wdc07  ████████████░░░░░░░                                            15   │
│                                                                             │
│  lon06  ████████░░░                                                     8   │
│                                                                             │
│  tok05  █████░                                                          5   │
│                                                                             │
│         0          10          20          30          40                   │
│                                                                             │
│         ████ VSI    ░░░░ Bare Metal                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Gauge Charts

For utilisation metrics and thresholds.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Resource Utilisation                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│       vCPU Allocation          Memory Allocation         Storage Used       │
│                                                                             │
│           ╭───────╮                 ╭───────╮                ╭───────╮      │
│         ╱    ▲     ╲              ╱    ▲     ╲             ╱    ▲     ╲     │
│        │  ╱─────╲   │            │  ╱─────╲   │           │  ╱─────╲   │    │
│        │ ╱███████╲  │            │ ╱███░░░░╲  │           │ ╱██████░╲  │    │
│        │ █████████  │            │ ████░░░░░  │           │ ████████░  │    │
│        │           │            │           │           │           │    │
│                                                                             │
│          156/200                   89/256 GB                3.2/5.0 TB      │
│            78%                       35%                      64%           │
│                                                                             │
│        ███ Used    ░░░ Available    ─── Warning (80%)    ─── Critical (90%)│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Geographic Visualisation

### 6.1 World Map with Datacenters

**Interactive Map:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Global Infrastructure Distribution                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                          ○ lon06                                            │
│                          8 servers                                          │
│                          $1,750/mo              ○ tok05                     │
│                                ╲                5 servers                   │
│         ○ wdc07                 ╲               $1,200/mo                   │
│         15 servers               ╲             ╱                            │
│         $3,200/mo                 ╲           ╱                             │
│              ╲                     ╲         ╱                              │
│               ╲    ┌─────────────────────────────┐                          │
│                ╲   │                             │                          │
│                 ╲  │                             │                          │
│   ◉ dal13 ───────>│        WORLD MAP            │<──── ○ syd05             │
│   25 servers      │        (Simplified)         │      4 servers           │
│   $7,500/mo       │                             │      $800/mo             │
│                   │                             │                          │
│                   └─────────────────────────────┘                          │
│                                                                             │
│   Bubble size = Server count        Color intensity = Monthly cost          │
│   ◉ Primary DC    ○ Secondary DC    Click bubble for details               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Datacenter Detail Panel

When clicking a datacenter bubble:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  dal13 - Dallas 13                                              [ × Close ] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────┐    ┌─────────────────────────────────────┐   │
│   │                         │    │ Resources                           │   │
│   │    ◉ dal13              │    │                                     │   │
│   │                         │    │ Virtual Servers     20    ████████  │   │
│   │    📍 Dallas, TX, USA   │    │ Bare Metal           5    ███       │   │
│   │                         │    │ VLANs                6    ████      │   │
│   │    Status: ● Active     │    │ Block Storage       12    ██████    │   │
│   │                         │    │ File Storage         3    ██        │   │
│   │                         │    │                                     │   │
│   └─────────────────────────┘    └─────────────────────────────────────┘   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │ Monthly Cost: $7,500                                                │  │
│   │ █████████████████████████████████████████████████████████████ 60%   │  │
│   │                                                                     │  │
│   │ Compute: $5,200  │  Storage: $2,100  │  Network: $200              │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│   [ View Resources ]    [ View Topology ]    [ Export DC Report ]          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Map Implementation

**Recommended Libraries:**

| Library | Pros | Cons |
|---------|------|------|
| **react-simple-maps** | Lightweight, React-native, easy customisation | Limited interactivity |
| **Mapbox GL** | Beautiful, performant, great interactions | Requires API key, heavier |
| **Leaflet** | Mature, many plugins, free | Dated look without customisation |
| **D3-geo** | Maximum control, lightweight | More development effort |

**Recommendation:** Use **react-simple-maps** for simplicity, with custom bubble markers.

---

## 7. Collection Progress Animation

### 7.1 Multi-Phase Progress Stepper

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Collecting Infrastructure Data                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │   ◉━━━━━━━━◉━━━━━━━━◉━━━━━━━━◎━━━━━━━━○━━━━━━━━○━━━━━━━━○            │ │
│  │  Auth    Compute  Network  Storage  Security   DNS    Complete        │ │
│  │   ✓        ✓        ✓        ●        ○         ○                     │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│                                                                             │
│   Phase 4 of 6: Storage Resources                                          │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────────┐│
│   │                                                                       ││
│   │ Block Storage    ████████████████████████████████░░░░░░  24/30  80%  ││
│   │                                                                       ││
│   │ File Storage     ████████████████████░░░░░░░░░░░░░░░░░░   8/15  53%  ││
│   │                                                                       ││
│   │ Object Storage   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0/3    0%  ││
│   │                                                                       ││
│   └───────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────────┐│
│   │  Resources Collected: 127        Elapsed: 01:23        ETA: 00:45    ││
│   │  ████████████████████████████████████████████████░░░░░░░░░░░░  75%   ││
│   └───────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│                                              [ Cancel Collection ]          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Stepper Node States

```
◉ Completed     ─ Filled blue circle with checkmark
◎ In Progress   ─ Blue ring with animated spinner
○ Pending       ─ Gray outline circle
◉ Error         ─ Red filled circle with X
```

### 7.3 Progress Bar Animation

**Indeterminate (unknown total):**

```css
.progress-indeterminate {
  background: linear-gradient(
    90deg,
    transparent 0%,
    #0f62fe 50%,
    transparent 100%
  );
  animation: slide 1.5s infinite;
}

@keyframes slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

**Determinate (known total):**

```css
.progress-bar {
  transition: width 0.3s ease-out;
}
```

### 7.4 Resource Collection Cards

As each resource type completes, show a summary card:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Collection Results                                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                │
│  │ ✓ VSIs          │ │ ✓ Bare Metal    │ │ ✓ VLANs         │                │
│  │                 │ │                 │ │                 │                │
│  │      45         │ │       8         │ │      12         │                │
│  │   collected     │ │   collected     │ │   collected     │                │
│  │                 │ │                 │ │                 │                │
│  │   2.3 sec       │ │   1.1 sec       │ │   0.8 sec       │                │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘                │
│                                                                              │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                │
│  │ ● Storage       │ │ ○ Security      │ │ ○ DNS           │                │
│  │                 │ │                 │ │                 │                │
│  │   Collecting... │ │     Pending     │ │     Pending     │                │
│  │                 │ │                 │ │                 │                │
│  │   ████████░░░   │ │   ░░░░░░░░░░░   │ │   ░░░░░░░░░░░   │                │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘                │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 7.5 Completion Animation

When collection finishes:

```typescript
// Confetti burst (subtle)
import confetti from 'canvas-confetti';

function celebrateCompletion() {
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.7 },
    colors: ['#0f62fe', '#24a148', '#8a3ffc'],
    disableForReducedMotion: true,
  });
}
```

**Success Banner:**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ✓ Collection Complete                                          [ Dismiss ] │
│                                                                              │
│    Collected 165 resources across 12 categories in 2 minutes 34 seconds     │
│                                                                              │
│    [ View Dashboard ]    [ Export All ]    [ View Topology ]                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Resource Cards & Sparklines

### 8.1 Resource Summary Cards

Cards provide a scannable overview before diving into tables.

**Card Grid:**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Virtual Servers                                               View All →    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │  ● web-prod-1    │  │  ● app-prod-1    │  │  ● db-prod-1     │           │
│  │  ──────────────  │  │  ──────────────  │  │  ──────────────  │           │
│  │                  │  │                  │  │                  │           │
│  │  4 vCPU │  8 GB  │  │  8 vCPU │ 16 GB  │  │ 16 vCPU │ 64 GB  │           │
│  │  RHEL 8 │ dal13  │  │  Ubuntu │ dal13  │  │  RHEL 8 │ dal13  │           │
│  │                  │  │                  │  │                  │           │
│  │  CPU ▁▂▃▅▇█▇▅▃▂  │  │  CPU ▅▅▅▅▅▅▅▅▅▅  │  │  CPU ▁▂▃▅▇█████  │           │
│  │  MEM ▅▅▅▆▆▆▆▆▆▆  │  │  MEM ▃▃▃▃▃▃▃▃▃▃  │  │  MEM ▇▇▇▇▇▇▇▇▇▇  │           │
│  │                  │  │                  │  │                  │           │
│  │  $150/mo         │  │  $300/mo         │  │  $800/mo         │           │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘           │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │  ● web-dev-1     │  │  ○ test-server   │  │  +39 more        │           │
│  │  ──────────────  │  │  ──────────────  │  │                  │           │
│  │                  │  │                  │  │  View all        │           │
│  │  2 vCPU │  4 GB  │  │  2 vCPU │  4 GB  │  │  virtual servers │           │
│  │  ...             │  │  ...             │  │  →               │           │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Card Specifications

**Standard Resource Card:**

```
┌────────────────────────────────────┐
│  ● web-prod-1            [⋮]      │  ← Status dot + hostname + actions menu
│  ─────────────────────────────────│
│                                    │
│  4 vCPU  │  8 GB  │  100 GB       │  ← Key specs in columns
│  RHEL 8.6  │  dal13               │  ← OS and location
│                                    │
│  ┌────────────────────────────┐   │
│  │ CPU  ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁       │   │  ← CPU sparkline (last 24h)
│  │ MEM  ▅▅▅▆▆▆▇▇▇▇▇▇▇▇▇       │   │  ← Memory sparkline
│  └────────────────────────────┘   │
│                                    │
│  10.1.1.5                  $150   │  ← IP address + monthly cost
└────────────────────────────────────┘

Dimensions: 180px × 180px
Padding: 16px
Border: 1px solid Gray 20
Border Radius: 8px
Hover: Shadow elevation + border Blue 60
```

### 8.3 Sparkline Details

**Two-Line Sparkline Component:**

```typescript
interface SparklineProps {
  cpuData: number[];      // 24 data points (hourly)
  memoryData: number[];   // 24 data points (hourly)
  width: 120;
  height: 24;
  cpuColor: '#0f62fe';    // Blue
  memColor: '#8a3ffc';    // Purple
}
```

**Rendering:**

```tsx
<svg width={120} height={48}>
  {/* CPU Line */}
  <path
    d={generateSparklinePath(cpuData, 120, 20)}
    fill="none"
    stroke="#0f62fe"
    strokeWidth="2"
  />
  
  {/* Memory Line */}
  <path
    d={generateSparklinePath(memoryData, 120, 20)}
    fill="none"
    stroke="#8a3ffc"
    strokeWidth="2"
    transform="translate(0, 24)"
  />
  
  {/* Labels */}
  <text x="0" y="10" fontSize="10" fill="#525252">CPU</text>
  <text x="0" y="34" fontSize="10" fill="#525252">MEM</text>
</svg>
```

### 8.4 Status Indicators

| Status | Icon | Colour | Label |
|--------|------|--------|-------|
| Running | ● | Green 50 | Running |
| Stopped | ○ | Gray 50 | Stopped |
| Starting | ◐ (animated) | Blue 60 | Starting |
| Stopping | ◑ (animated) | Yellow 40 | Stopping |
| Error | ● | Red 60 | Error |
| Maintenance | ● | Purple 50 | Maintenance |

---

## 9. Data Tables Enhancement

### 9.1 Enhanced Table Header

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Virtual Servers (45)                                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ 🔍 Search virtual servers...                                           │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Columns  ▼  │ │ Datacenter▼ │ │  Status  ▼  │ │ Export ▼ │ │    ⟳    │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘ └──────────┘ │
│                                                                              │
│  Active Filters: [dal13 ×] [Running ×]                     Clear All        │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  ☐ │ Hostname ▼    │ IP Address    │ vCPU │ RAM    │ OS       │ DC    │ ... │
├──────────────────────────────────────────────────────────────────────────────┤
```

### 9.2 Row Styling

**Alternating Rows:**

```css
.table-row:nth-child(odd) {
  background: #ffffff;
}
.table-row:nth-child(even) {
  background: #f4f4f4;
}
```

**Row Hover:**

```css
.table-row:hover {
  background: #e5f6ff; /* Blue 10 tint */
  cursor: pointer;
}
```

**Selected Row:**

```css
.table-row.selected {
  background: #d0e2ff; /* Blue 20 */
  border-left: 3px solid #0f62fe;
}
```

### 9.3 Status Cell with Badge

```
┌────────────────┐
│ ● Running      │  ← Green dot + text
└────────────────┘

┌────────────────┐
│ ○ Stopped      │  ← Gray dot + text
└────────────────┘

┌────────────────┐
│ ⚠ Warning      │  ← Yellow warning icon + text
└────────────────┘
```

### 9.4 Inline Sparklines in Table

```
┌────────┬──────────────┬───────────┬──────┬────────┬──────────────┬─────────┐
│   ☐    │ Hostname     │ IP        │ vCPU │  RAM   │ CPU (24h)    │ Status  │
├────────┼──────────────┼───────────┼──────┼────────┼──────────────┼─────────┤
│   ☐    │ web-prod-1   │ 10.1.1.5  │  4   │  8 GB  │ ▁▂▃▅▇█▇▅▃▂▁ │● Running│
│   ☐    │ web-prod-2   │ 10.1.1.6  │  4   │  8 GB  │ ▅▅▅▅▅▅▅▅▅▅▅ │● Running│
│   ☐    │ db-prod-1    │ 10.1.2.10 │ 16   │ 64 GB  │ ▁▂▃▅▇██████ │● Running│
│   ☐    │ test-server  │ 10.2.1.20 │  2   │  4 GB  │ ░░░░░░░░░░░ │○ Stopped│
└────────┴──────────────┴───────────┴──────┴────────┴──────────────┴─────────┘
```

### 9.5 Expandable Row Details

```
┌────────┬──────────────┬───────────┬──────┬────────┬─────────┐
│   ☐    │ web-prod-1   │ 10.1.1.5  │  4   │  8 GB  │● Running│
├────────┴──────────────┴───────────┴──────┴────────┴─────────┤
│  ▼ Expanded Details                                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  Created: 2024-06-15        Last Modified: 2025-01-20  │ │
│  │  Billing: Monthly ($150)    Local Disk: No (SAN)       │ │
│  │                                                        │ │
│  │  VLANs: 1234 (Public), 1235 (Private)                  │ │
│  │  Storage: vol-001 (500GB), vol-002 (100GB)             │ │
│  │                                                        │ │
│  │  Tags: environment:prod, app:web, team:platform        │ │
│  │                                                        │ │
│  │  [ View in Console ]  [ View Topology ]  [ Export ]    │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
├────────┬──────────────┬───────────┬──────┬────────┬─────────┤
│   ☐    │ web-prod-2   │ 10.1.1.6  │  4   │  8 GB  │● Running│
└────────┴──────────────┴───────────┴──────┴────────┴─────────┘
```

---

## 10. Micro-Interactions & Animations

### 10.1 Animation Principles

**IBM Carbon Motion Guidelines:**

| Type | Duration | Easing |
|------|----------|--------|
| Micro (buttons, toggles) | 100-150ms | ease-out |
| Small (cards, tooltips) | 150-200ms | ease-out |
| Medium (modals, panels) | 200-300ms | ease-in-out |
| Large (page transitions) | 300-400ms | ease-in-out |

### 10.2 Button Interactions

**Primary Button:**

```css
.btn-primary {
  transition: all 150ms ease-out;
}

.btn-primary:hover {
  background: #0353e9; /* Slightly darker blue */
  transform: translateY(-1px);
}

.btn-primary:active {
  background: #002d9c;
  transform: translateY(0);
}
```

**Loading State:**

```css
.btn-loading {
  position: relative;
  color: transparent;
}

.btn-loading::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid #fff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
```

### 10.3 Card Hover Effects

```css
.resource-card {
  transition: all 200ms ease-out;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.resource-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  border-color: #0f62fe;
}
```

### 10.4 Toast Notifications

**Slide-in Animation:**

```css
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast {
  animation: slideIn 300ms ease-out;
}

.toast.exiting {
  animation: slideIn 200ms ease-in reverse;
}
```

**Toast Types:**

```
┌───────────────────────────────────────────────────┐
│ ✓  Collection complete - 165 resources found   × │  ← Success (green)
└───────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────┐
│ ⚠  Rate limit reached - retrying in 5 seconds  × │  ← Warning (yellow)
└───────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────┐
│ ✕  Failed to collect DNS records               × │  ← Error (red)
└───────────────────────────────────────────────────┘
```

### 10.5 Skeleton Loading

Instead of spinners, use skeleton screens that match the layout:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Virtual Servers                                                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │ ░░░░░░░░░░░░░░░░ │  │ ░░░░░░░░░░░░░░░░ │  │ ░░░░░░░░░░░░░░░░ │           │
│  │ ░░░░░░░░░░░░░░░░ │  │ ░░░░░░░░░░░░░░░░ │  │ ░░░░░░░░░░░░░░░░ │           │
│  │                  │  │                  │  │                  │           │
│  │ ░░░░░  │  ░░░░░  │  │ ░░░░░  │  ░░░░░  │  │ ░░░░░  │  ░░░░░  │           │
│  │ ░░░░░░░░░░░░░░░░ │  │ ░░░░░░░░░░░░░░░░ │  │ ░░░░░░░░░░░░░░░░ │           │
│  │                  │  │                  │  │                  │           │
│  │ ░░░░░░░░░░░░░░░░ │  │ ░░░░░░░░░░░░░░░░ │  │ ░░░░░░░░░░░░░░░░ │           │
│  │                  │  │                  │  │                  │           │
│  │ ░░░░░░░░         │  │ ░░░░░░░░         │  │ ░░░░░░░░         │           │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Skeleton Animation:**

```css
.skeleton {
  background: linear-gradient(
    90deg,
    #e0e0e0 25%,
    #f4f4f4 50%,
    #e0e0e0 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### 10.6 Highlighting Related Elements

When hovering over a resource, highlight related items:

```css
/* Dim unrelated items */
.topology-container.focus-mode .node:not(.related) {
  opacity: 0.3;
  transition: opacity 200ms ease-out;
}

/* Highlight related items */
.topology-container.focus-mode .node.related {
  opacity: 1;
  filter: drop-shadow(0 0 4px #0f62fe);
}

/* Pulse the hovered item */
.node.hovered {
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

### 10.7 Number Transitions

When metrics update, animate the change:

```tsx
import { useSpring, animated } from '@react-spring/web';

function AnimatedMetric({ value, previousValue }) {
  const isIncrease = value > previousValue;
  
  const { number, color } = useSpring({
    from: { number: previousValue, color: '#161616' },
    to: { 
      number: value, 
      color: isIncrease ? '#24a148' : '#da1e28' 
    },
    config: { duration: 500 },
  });

  return (
    <animated.span style={{ color }}>
      {number.to(n => n.toFixed(0))}
    </animated.span>
  );
}
```

---

## 11. Dark Mode Support

### 11.1 Colour Token Mapping

IBM Carbon provides dark mode tokens out of the box:

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Background | `#f4f4f4` (Gray 10) | `#161616` (Gray 100) |
| Container | `#ffffff` (White) | `#262626` (Gray 90) |
| Border | `#e0e0e0` (Gray 20) | `#393939` (Gray 80) |
| Primary Text | `#161616` (Gray 100) | `#f4f4f4` (Gray 10) |
| Secondary Text | `#525252` (Gray 70) | `#a8a8a8` (Gray 40) |
| Primary Action | `#0f62fe` (Blue 60) | `#78a9ff` (Blue 40) |
| Success | `#24a148` (Green 50) | `#42be65` (Green 40) |
| Error | `#da1e28` (Red 60) | `#fa4d56` (Red 50) |

### 11.2 Dark Mode Dashboard

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ████████████████████████████████████████████████████████████████████████████ │
│ ██                                                                        ██ │
│ ██   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       ██ │
│ ██   │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │       ██ │
│ ██   │ ▓             ▓ │  │ ▓             ▓ │  │ ▓             ▓ │       ██ │
│ ██   │ ▓     45      ▓ │  │ ▓      8      ▓ │  │ ▓  $12,450    ▓ │       ██ │
│ ██   │ ▓    VSIs     ▓ │  │ ▓  Bare Metal ▓ │  │ ▓  Monthly    ▓ │       ██ │
│ ██   │ ▓             ▓ │  │ ▓             ▓ │  │ ▓             ▓ │       ██ │
│ ██   │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │       ██ │
│ ██   └─────────────────┘  └─────────────────┘  └─────────────────┘       ██ │
│ ██                                                                        ██ │
│ ████████████████████████████████████████████████████████████████████████████ │
└──────────────────────────────────────────────────────────────────────────────┘

Background: #161616 (Gray 100)
Cards: #262626 (Gray 90)
Text: #f4f4f4 (Gray 10)
Accent: #78a9ff (Blue 40)
```

### 11.3 Implementation with Carbon

```tsx
import { GlobalTheme } from '@carbon/react';

function App() {
  const [theme, setTheme] = useState<'white' | 'g100'>('white');
  
  return (
    <GlobalTheme theme={theme}>
      <ThemeToggle 
        checked={theme === 'g100'}
        onChange={() => setTheme(t => t === 'white' ? 'g100' : 'white')}
      />
      <AppContent />
    </GlobalTheme>
  );
}
```

### 11.4 Theme Toggle Button

```
┌────────────────────────────────────────────┐
│                              [ ☀️ │ 🌙 ]   │  ← Toggle in header
└────────────────────────────────────────────┘
```

---

## 12. Recommended Technology Stack

### 12.1 Chart & Visualisation Libraries

| Library | Use Case | Bundle Size | Recommendation |
|---------|----------|-------------|----------------|
| **@carbon/charts-react** | Standard charts | ~150KB | Primary for bar, line, donut |
| **Recharts** | Sparklines | ~45KB | Lightweight inline charts |
| **React Flow** | Topology diagram | ~100KB | Best for interactive node graphs |
| **D3.js** | Custom viz (treemap, sunburst) | ~70KB | Maximum flexibility |
| **react-simple-maps** | World map | ~30KB | Geographic distribution |
| **Framer Motion** | Animations | ~30KB | Smooth micro-interactions |
| **@react-spring/web** | Number animations | ~20KB | Animated counters |

### 12.2 Installation

```bash
# Core Carbon
npm install @carbon/react @carbon/icons-react @carbon/charts-react

# Visualisations
npm install react-flow-renderer recharts d3 react-simple-maps

# Animations
npm install framer-motion @react-spring/web

# Utilities
npm install canvas-confetti  # Completion celebration
```

### 12.3 Bundle Size Strategy

**Code Splitting:**

```tsx
// Lazy load heavy visualisation components
const TopologyDiagram = lazy(() => import('./TopologyDiagram'));
const CostTreemap = lazy(() => import('./CostTreemap'));
const WorldMap = lazy(() => import('./WorldMap'));

// Use in routes
<Suspense fallback={<ChartSkeleton />}>
  <TopologyDiagram data={networkData} />
</Suspense>
```

**Tree Shaking:**

```tsx
// Import only what you need from D3
import { treemap, hierarchy } from 'd3-hierarchy';
import { scaleOrdinal } from 'd3-scale';
// NOT: import * as d3 from 'd3';
```

---

## 13. Implementation Roadmap

### 13.1 Phase 1: MVP Visual Enhancements

**Week 1-2: Dashboard Foundation**
- [ ] Implement metric cards with animated counters
- [ ] Add sparklines to metric cards (using Recharts)
- [ ] Implement skeleton loading states
- [ ] Add toast notification system

**Week 3-4: Charts**
- [ ] Donut charts for resource distribution
- [ ] Bar chart for datacenter comparison
- [ ] Carbon Charts integration

### 13.2 Phase 1.5: Enhanced Visualisations

**Week 5-6: Cost Visualisations**
- [ ] Treemap for cost breakdown (D3)
- [ ] Cost trend line chart
- [ ] Sunburst drill-down (optional)

**Week 7-8: Progress & Polish**
- [ ] Multi-phase progress stepper
- [ ] Collection progress animation
- [ ] Dark mode support
- [ ] Micro-interactions & hover effects

### 13.3 Phase 2: Premium Features

**Week 9-12: Topology Diagram**
- [ ] React Flow integration
- [ ] Node designs (VSI, BM, Storage, Gateway)
- [ ] Connection lines and animations
- [ ] Pan, zoom, and filtering
- [ ] Layout algorithm options

**Week 13-14: Geographic View**
- [ ] World map with datacenter bubbles
- [ ] Datacenter detail panels
- [ ] Click interactions

### 13.4 Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Animated metric cards | High | Low | P1 |
| Donut distribution charts | High | Low | P1 |
| Collection progress stepper | High | Medium | P1 |
| Dark mode | Medium | Low | P1 |
| Cost treemap | High | Medium | P2 |
| Sparklines in tables | Medium | Low | P2 |
| Topology diagram | Very High | High | P2 |
| World map | Medium | Medium | P3 |
| Sunburst chart | Low | Medium | P3 |

---

## 14. Appendix: Code Examples

### 14.1 Animated Counter Component

```tsx
// components/AnimatedCounter.tsx
import { useSpring, animated } from '@react-spring/web';
import { useEffect, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
}

export function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  duration = 1500,
  decimals = 0,
}: AnimatedCounterProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const { number } = useSpring({
    from: { number: 0 },
    to: { number: isVisible ? value : 0 },
    config: { duration },
  });

  return (
    <animated.span className="animated-counter">
      {number.to(n => `${prefix}${n.toFixed(decimals).toLocaleString()}${suffix}`)}
    </animated.span>
  );
}
```

### 14.2 Sparkline Component

```tsx
// components/Sparkline.tsx
import { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showEndDot?: boolean;
}

export function Sparkline({
  data,
  width = 100,
  height = 24,
  color = '#0f62fe',
  showEndDot = true,
}: SparklineProps) {
  const path = useMemo(() => {
    if (data.length === 0) return '';
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    });
    
    return `M${points.join(' L')}`;
  }, [data, width, height]);

  const lastPoint = useMemo(() => {
    if (data.length === 0) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const lastValue = data[data.length - 1];
    return {
      x: width,
      y: height - ((lastValue - min) / range) * height,
    };
  }, [data, width, height]);

  return (
    <svg width={width} height={height} className="sparkline">
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showEndDot && lastPoint && (
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="3"
          fill={color}
        />
      )}
    </svg>
  );
}
```

### 14.3 Metric Card Component

```tsx
// components/MetricCard.tsx
import { AnimatedCounter } from './AnimatedCounter';
import { Sparkline } from './Sparkline';
import { TrendIndicator } from './TrendIndicator';

interface MetricCardProps {
  title: string;
  value: number;
  trend?: number;
  trendData?: number[];
  prefix?: string;
  suffix?: string;
  subtitle?: string;
  loading?: boolean;
}

export function MetricCard({
  title,
  value,
  trend,
  trendData = [],
  prefix,
  suffix,
  subtitle,
  loading = false,
}: MetricCardProps) {
  if (loading) {
    return (
      <div className="metric-card metric-card--loading">
        <div className="skeleton skeleton--text" style={{ width: '60%' }} />
        <div className="skeleton skeleton--heading" />
        <div className="skeleton skeleton--sparkline" />
      </div>
    );
  }

  return (
    <div className="metric-card">
      <div className="metric-card__value">
        <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
      </div>
      
      {trend !== undefined && (
        <TrendIndicator value={trend} />
      )}
      
      <div className="metric-card__title">{title}</div>
      
      {trendData.length > 0 && (
        <div className="metric-card__sparkline">
          <Sparkline data={trendData} />
        </div>
      )}
      
      {subtitle && (
        <div className="metric-card__subtitle">{subtitle}</div>
      )}
    </div>
  );
}
```

### 14.4 Donut Chart with Centre Label

```tsx
// components/DonutChart.tsx
import { DonutChart as CarbonDonut } from '@carbon/charts-react';
import '@carbon/charts/styles.css';

interface DonutChartProps {
  data: { group: string; value: number }[];
  centerLabel: string;
  centerValue: string | number;
}

export function DonutChart({ data, centerLabel, centerValue }: DonutChartProps) {
  const options = {
    donut: {
      center: {
        label: centerLabel,
        number: String(centerValue),
        numberFontSize: () => 24,
      },
      alignment: 'center',
    },
    pie: {
      labels: {
        enabled: false,
      },
    },
    legend: {
      alignment: 'center',
      position: 'bottom',
    },
    height: '200px',
    color: {
      scale: {
        'RHEL': '#6929c4',
        'Ubuntu': '#1192e8',
        'Windows': '#005d5d',
        'CentOS': '#9f1853',
      },
    },
  };

  return <CarbonDonut data={data} options={options} />;
}
```

### 14.5 Topology Node Component (React Flow)

```tsx
// components/topology/VSINode.tsx
import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Sparkline } from '../Sparkline';

interface VSINodeData {
  hostname: string;
  ip: string;
  cpu: number;
  memory: number;
  status: 'running' | 'stopped' | 'starting';
  cpuHistory: number[];
}

export const VSINode = memo(({ data }: NodeProps<VSINodeData>) => {
  const statusColors = {
    running: '#24a148',
    stopped: '#6f6f6f',
    starting: '#f1c21b',
  };

  return (
    <div className="topology-node topology-node--vsi">
      <Handle type="target" position={Position.Top} />
      
      <div className="topology-node__header">
        <span 
          className="topology-node__status"
          style={{ backgroundColor: statusColors[data.status] }}
        />
        <span className="topology-node__hostname">{data.hostname}</span>
      </div>
      
      <div className="topology-node__specs">
        <span>{data.cpu} vCPU</span>
        <span>{data.memory} GB</span>
      </div>
      
      <div className="topology-node__sparkline">
        <Sparkline data={data.cpuHistory} width={80} height={20} />
      </div>
      
      <div className="topology-node__ip">{data.ip}</div>
      
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

VSINode.displayName = 'VSINode';
```

### 14.6 Progress Stepper Component

```tsx
// components/CollectionProgress.tsx
import { CheckmarkFilled, CircleDash, InProgress } from '@carbon/icons-react';

interface Step {
  id: string;
  label: string;
  status: 'complete' | 'in-progress' | 'pending' | 'error';
  count?: number;
  total?: number;
}

interface CollectionProgressProps {
  steps: Step[];
  currentStep: string;
}

export function CollectionProgress({ steps, currentStep }: CollectionProgressProps) {
  return (
    <div className="collection-progress">
      <div className="collection-progress__stepper">
        {steps.map((step, index) => (
          <div key={step.id} className="collection-progress__step">
            <div className={`step-icon step-icon--${step.status}`}>
              {step.status === 'complete' && <CheckmarkFilled size={24} />}
              {step.status === 'in-progress' && <InProgress size={24} className="spinning" />}
              {step.status === 'pending' && <CircleDash size={24} />}
            </div>
            
            {index < steps.length - 1 && (
              <div className={`step-connector step-connector--${step.status}`} />
            )}
            
            <div className="step-label">{step.label}</div>
          </div>
        ))}
      </div>
      
      {steps.find(s => s.id === currentStep)?.status === 'in-progress' && (
        <div className="collection-progress__details">
          <ProgressBar 
            value={steps.find(s => s.id === currentStep)?.count || 0}
            max={steps.find(s => s.id === currentStep)?.total || 100}
          />
        </div>
      )}
    </div>
  );
}
```

---

## Summary

This visual design document provides comprehensive guidance for creating a visually impressive IBM Cloud Infrastructure Explorer. The key differentiators will be:

1. **Animated Dashboard Metrics** - Dynamic counters and sparklines
2. **Interactive Topology Diagram** - The signature feature
3. **Rich Cost Visualisations** - Treemaps and sunbursts
4. **Polished Micro-Interactions** - Professional feel throughout
5. **Dark Mode Support** - Modern and eye-friendly

By following IBM Carbon Design System guidelines while adding these enhanced visualisations, the tool will feel both professional and innovative—suitable for both internal IBM use and customer-facing demonstrations.

---

**Document End**