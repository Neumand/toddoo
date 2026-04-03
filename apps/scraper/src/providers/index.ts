import type { Provider } from "@toddoo/types";
import { WestIslandMommiesProvider } from "./west-island-mommies.js";
import { MontrealOpenDataProvider } from "./montreal-open-data.js";
import { WestIslandBlogProvider } from "./west-island-blog.js";

export const providers: Provider[] = [
  new WestIslandMommiesProvider(),
  new MontrealOpenDataProvider(),
  new WestIslandBlogProvider(),
];
