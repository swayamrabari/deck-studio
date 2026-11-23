/**
 * The engine slide library — importable from any deck page as:
 *
 *   import { TitleSlide, Bullets, StatRow } from "@/components/slides";
 *
 * Resolved by the runtime module map (`lib/runtime-compiler.ts`).
 */
export {
  FullBleed,
  Grid,
  SectionSlide,
  Statement,
  TitleSlide,
  TwoColumn,
} from "./layouts";
export {
  Bullets,
  FitImage,
  Quote,
  Stat,
  StatRow,
  Table,
  type Bullet,
} from "./content";
export { Appear, SlideStepContext, SlideStepProvider } from "./step";
export { CodeBlock } from "./code-block";
