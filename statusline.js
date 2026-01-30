#!/usr/bin/env bun
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});

process.stdin.on("end", () => {
  try {
    const d = JSON.parse(input);
    const model = d.model?.display_name || "Claude";
    const ctxPct = d.context_window?.used_percentage || 0;
    const ctxColor =
      ctxPct >= 90 ? "\x1b[91m" : ctxPct >= 70 ? "\x1b[93m" : "\x1b[92m";
    const usage = d.context_window?.current_usage || {};
    const inTok =
      (usage.input_tokens || 0) +
      (usage.cache_creation_input_tokens || 0) +
      (usage.cache_read_input_tokens || 0);
    const outTok = usage.output_tokens || 0;
    const cost = d.cost?.total_cost_usd || 0;
    const durMs = d.cost?.total_duration_ms || 0;
    const durMin = Math.floor(durMs / 60000);
    const durHr = Math.floor(durMin / 60);
    const durStr = durHr > 0 ? durHr + "h" + (durMin % 60) + "m" : durMin + "m";
    let branch = "";
    try {
      branch = execSync("git rev-parse --abbrev-ref HEAD 2>/dev/null", {
        cwd: d.cwd,
        encoding: "utf8",
        timeout: 1000,
      }).trim();
    } catch (e) {}

    // CRITICAL: Context threshold warning at 4% REMAINING (96% used)
    const alertFile = path.join(
      process.env.USERPROFILE || process.env.HOME,
      ".claude",
      ".context-alert",
    );
    const SUMMARY_THRESHOLD = 96; // 4% remaining
    const WARNING_THRESHOLD = 90; // 10% remaining - early warning

    if (ctxPct >= SUMMARY_THRESHOLD) {
      // CRITICAL: Output warning IMMEDIATELY via stderr
      console.error("\n" + "!".repeat(60));
      console.error("!!! CONTEXT LIMIT - SAVE SUMMARY NOW !!!");
      console.error("!".repeat(60));
      console.error(`Context at ${ctxPct}% - only ${100 - ctxPct}% remaining!`);
      console.error("");
      console.error("STOP and save summary to: conversation_history/");
      console.error(
        "Then /clear and resume with: Resume from @summary_file.md",
      );
      console.error("!".repeat(60) + "\n");

      // Also write alert file for hook
      fs.writeFileSync(
        alertFile,
        JSON.stringify({
          pct: ctxPct,
          session: d.session_id,
          cwd: d.cwd,
          ts: Date.now(),
          type: "summary",
        }),
      );
    } else if (ctxPct >= WARNING_THRESHOLD) {
      // Early warning
      console.error(`\n>>> Context at ${ctxPct}% - approaching limit <<<\n`);
    } else if (fs.existsSync(alertFile)) {
      // Clear alert if below threshold
      try {
        const existing = JSON.parse(fs.readFileSync(alertFile, "utf-8"));
        if (existing.type === "summary") {
          fs.unlinkSync(alertFile);
        }
      } catch {
        fs.unlinkSync(alertFile);
      }
    }

    const reset = "\x1b[0m",
      cyan = "\x1b[96m",
      magenta = "\x1b[95m",
      red = "\x1b[91m",
      dim = "\x1b[90m",
      bold = "\x1b[1m",
      blink = "\x1b[5m",
      bgRed = "\x1b[41m",
      white = "\x1b[97m";

    // Build status parts
    const parts = [
      cyan + bold + model + reset,
      dim + d.cwd + reset,
      ctxColor + "Ctx:" + ctxPct + "%" + reset,
      dim +
        (inTok / 1000).toFixed(0) +
        "k/" +
        (outTok / 1000).toFixed(0) +
        "k" +
        reset,
      red + "\$" + cost.toFixed(2) + reset,
      branch ? magenta + branch + reset : null,
      dim + durStr + reset,
    ].filter(Boolean);

    // Add warning to status bar if threshold reached
    if (ctxPct >= SUMMARY_THRESHOLD) {
      parts.push(bgRed + white + bold + " SAVE SUMMARY NOW " + reset);
    } else if (ctxPct >= WARNING_THRESHOLD) {
      parts.push(red + bold + "⚠ LOW CTX" + reset);
    }

    console.log(parts.join(" | "));
  } catch (e) {
    console.log("[Status Error]");
  }
});
