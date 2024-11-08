#!/usr/bin/env node

import { LOCAL_REPO_PATH } from "./config.js";
import { cleanupPulls } from "./pull.js";

cleanupPulls(LOCAL_REPO_PATH)
