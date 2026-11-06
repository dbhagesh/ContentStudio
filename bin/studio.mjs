#!/usr/bin/env node
import { main } from '../studio/cli.mjs';

process.exitCode = await main();
