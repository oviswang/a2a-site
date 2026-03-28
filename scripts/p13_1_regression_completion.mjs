#!/usr/bin/env node
// P13-1 Regression completion generator (MVP)
// - deterministic
// - no DB, no platform
// - emits artifacts/regressions/<releaseId>/completion.json

import fs from 'node:fs';
import path from 'node:path';

function nowIso() {
  return new Date().toISOString();
}

function parseArgs(argv) {
  const out = { changeTypes: [], gates: [], releaseId: null, outDir: null, inputs: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--change-type') {
      out.changeTypes.push(argv[++i]);
    } else if (a === '--gate') {
      out.gates.push(argv[++i]);
    } else if (a === '--release-id') {
      out.releaseId = argv[++i];
    } else if (a === '--out-dir') {
      out.outDir = argv[++i];
    } else if (a === '--input') {
      const kv = argv[++i] || '';
      const [k, ...rest] = kv.split('=');
      out.inputs[k] = rest.join('=');
    } else {
      throw new Error(`Unknown arg: ${a}`);
    }
  }
  if (out.changeTypes.length === 0) throw new Error('Missing --change-type');
  if (out.gates.length === 0) throw new Error('Missing --gate (one or more)');
  return out;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// MVP required runs mapping: encode what "must run" means for a change type.
// We match by evidenceDir suffix (case dir) to keep deterministic without new infra.
const REQUIRED_RUNS = {
  refresh_cost_config: [
    {
      name: 'multi_parent long in-range sanity',
      evidenceDirSuffix: 'artifacts/evidence/p11-1/20260328T070328Z/cases/multi_parent.in.long.gating_effective',
      command: 'scripts/p7_2_gate_mvp.sh --dir <dir> --change-type refresh_cost_config',
      requiredMode: 'multi_parent',
      requiredWindow: 'long',
    },
    {
      name: 'multi_parent long out-of-range guardrail',
      evidenceDirSuffix: 'artifacts/evidence/p11-1/20260328T070328Z/cases/multi_parent.out.long.attention_too_high',
      command: 'scripts/p7_2_gate_mvp.sh --dir <dir> --change-type refresh_cost_config',
      requiredMode: 'multi_parent',
      requiredWindow: 'long',
    },
  ],

  same_role_coordination_config: [
    {
      name: 'same_role long stable should not be blocked',
      evidenceDirSuffix: 'artifacts/evidence/p11-1/20260328T070328Z/cases/same_role.in.long.stable',
      command: 'scripts/p7_2_gate_mvp.sh --dir <dir> --change-type same_role_coordination_config',
      requiredMode: 'same_role',
      requiredWindow: 'long',
    },
    {
      name: 'same_role long yield_high must remain blocked (deep policy)',
      evidenceDirSuffix: 'artifacts/evidence/p11-1/20260328T070328Z/cases/same_role.out.long.yield_high',
      command: 'scripts/p7_2_gate_mvp.sh --dir <dir> --change-type same_role_coordination_config',
      requiredMode: 'same_role',
      requiredWindow: 'long',
    },
  ],

  selection_logic_change: [
    {
      name: 'selection anomaly guardrail (long) must stay blocked',
      evidenceDirSuffix: 'artifacts/evidence/p13-2/20260328T154216Z/cases/multi_parent.out.long.selection_anomaly',
      command: 'scripts/p7_2_gate_mvp.sh --dir <dir> --change-type selection_logic_change',
      requiredMode: 'multi_parent',
      requiredWindow: 'long',
    },
    {
      name: 'combo long sanity (multi_parent+same_role)',
      evidenceDirSuffix: 'artifacts/evidence/p11-1/20260328T070328Z/cases/multi_parent_same_role.in.long.controlled',
      command: 'scripts/p7_2_gate_mvp.sh --dir <dir> --change-type selection_logic_change',
      requiredMode: 'multi_parent+same_role',
      requiredWindow: 'long',
    },
  ],

  runner_behavior_change: [
    {
      name: 'contract: gate output exists (spot)',
      evidenceDirSuffix: 'artifacts/evidence/p10-1/20260328T064554Z/cases/single.in.short.pass',
      command: 'scripts/p7_2_gate_mvp.sh --dir <dir> --change-type runner_behavior_change',
      requiredMode: 'single',
      requiredWindow: 'short',
    },
    {
      name: 'contract: signal_to_action works (spot)',
      evidenceDirSuffix: 'artifacts/evidence/p10-1/20260328T064554Z/cases/single.in.short.pass',
      command: 'node scripts/p7_3_signal_to_action.mjs <gate.json>',
      requiredMode: 'single',
      requiredWindow: 'short',
    },
  ],

  gate_rule_change: [
    {
      name: 'boundary human_required must stay blocked',
      evidenceDirSuffix: 'artifacts/evidence/p12-1/20260328T072524Z/cases/multi_parent_same_role.out.long.human_required',
      command: 'scripts/p7_2_gate_mvp.sh --dir <dir> --change-type gate_rule_change',
      requiredMode: 'multi_parent+same_role',
      requiredWindow: 'long',
    },
  ],
};

function inferEvidenceDirFromGate(gatePath) {
  const gate = readJson(gatePath);
  // gate schema has inputDir at top-level
  return gate.inputDir || null;
}

function summarizeGate(gate) {
  return {
    gateLevel: gate.gateLevel,
    releaseDisposition: gate.releaseDisposition,
    releaseReadiness: gate.releaseReadiness,
    releaseBlockingReasons: gate.releaseBlockingReasons || [],
    evidenceSufficiency: gate.evidenceSufficiency,
    dispositionPolicyVersion: gate.dispositionPolicyVersion,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const releaseId = args.releaseId || 'local';
  const outDir = args.outDir || path.join('artifacts', 'regressions', releaseId);
  fs.mkdirSync(outDir, { recursive: true });

  const requiredRunsSpec = [];
  for (const ct of args.changeTypes) {
    const spec = REQUIRED_RUNS[ct];
    if (spec) requiredRunsSpec.push(...spec.map(s => ({ changeType: ct, ...s })));
  }

  const requiredRuns = [];
  const providedEvidenceDirs = new Set();

  for (const gatePath of args.gates) {
    const gate = readJson(gatePath);
    const evidenceDir = inferEvidenceDirFromGate(gatePath) || gate.inputDir || null;
    if (evidenceDir) providedEvidenceDirs.add(evidenceDir);

    requiredRuns.push({
      name: gate.inputDir ? `gate:${path.basename(gate.inputDir)}` : 'gate',
      command: 'scripts/p7_2_gate_mvp.sh --dir <traceDir>',
      evidenceDir,
      gatePath,
      resultSummary: summarizeGate(gate),
    });
  }

  const missingRequired = [];
  // For each required spec, check if any provided evidenceDir matches suffix
  for (const spec of requiredRunsSpec) {
    const ok = Array.from(providedEvidenceDirs).some(d => d.endsWith(spec.evidenceDirSuffix));
    if (!ok) {
      missingRequired.push({
        changeType: spec.changeType,
        name: spec.name,
        requiredMode: spec.requiredMode || null,
        requiredWindow: spec.requiredWindow || null,
        expectedEvidenceDir: spec.evidenceDirSuffix,
        expectedCommand: spec.command,
        whyBlocking: 'required run missing for changeType; release will be blocked by standards',
      });
    }
  }

  const requiredRegressionsComplete = missingRequired.length === 0;

  const completion = {
    ok: true,
    kind: 'p13_1_regression_completion',
    schemaVersion: 'p13-1-mvp.1',
    releaseId,
    changeType: args.changeTypes,
    requiredRuns,
    requiredRegressionsComplete,
    missingRequired,
    generatedAt: nowIso(),
    inputs: {
      ...args.inputs,
      commit: args.inputs.commit || null,
      note: args.inputs.note || null,
      gates: args.gates,
    },
  };

  const outPath = path.join(outDir, 'completion.json');
  fs.writeFileSync(outPath, JSON.stringify(completion, null, 2));
  process.stdout.write(outPath + '\n');
}

main();
