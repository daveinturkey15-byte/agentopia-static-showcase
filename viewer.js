const catalogPath = "fixtures/catalog.json";
let selectedFixtureId = null;
let selectedCellKey = "0,0";
let loadedCatalog = [];
let currentPayload = null;
let currentSnapshotIndex = 0;
let currentFixture = null;
let currentLocalFileName = null;
let currentLocalLiveSessionId = null;
let replayAutoplayTimer = null;
const fixtureDetails = document.getElementById("fixture-details");
const replayReviewChecklist = document.getElementById("replay-review-checklist");
const fixturePromotionStatus = document.getElementById("fixture-promotion-status");
const replayValidationResults = document.getElementById("replay-validation-results");
const actionPreviewExamples = document.getElementById("action-preview-examples");
const actionSandboxInput = document.getElementById("action-sandbox-input");
const actionSandboxStatus = document.getElementById("action-sandbox-status");
const actionSandboxResult = document.getElementById("action-sandbox-result");
const actionResultPreviewStatus = document.getElementById("action-result-preview-status");
const actionResultPreviewLines = document.getElementById("action-result-preview-lines");
const actionRehearsalStatus = document.getElementById("action-rehearsal-status");
const actionRehearsalSummary = document.getElementById("action-rehearsal-summary");
const localActionRunnerButton = document.getElementById("local-action-runner-button");
const localActionRunnerStatus = document.getElementById("local-action-runner-status");
const localActionRunnerSummary = document.getElementById("local-action-runner-summary");
const localSessionTranscriptStatus = document.getElementById("local-session-transcript-status");
const localSessionTranscriptEntriesList = document.getElementById("local-session-transcript-entries");
const localSessionTranscriptClearButton = document.getElementById("local-session-transcript-clear");
const localSessionTranscriptFilterInput = document.querySelector("#local-session-transcript-filter");
const localSessionTranscriptFilterStatus = document.querySelector("#local-session-transcript-filter-status");
const localSessionSummaryStatus = document.querySelector("#local-session-summary-status");
const localSessionSummaryLines = document.querySelector("#local-session-summary-lines");
const localSessionReviewChecklistStatus = document.querySelector("#local-session-review-checklist-status");
const localSessionReviewChecklistItems = document.querySelector("#local-session-review-checklist-items");
const localSessionEvidenceCitationStatus = document.querySelector("#local-session-evidence-citation-status");
const localSessionEvidenceCitationLines = document.querySelector("#local-session-evidence-citation-lines");
const localSessionAttemptComparisonStatus = document.querySelector("#local-session-attempt-comparison-status");
const localSessionAttemptComparisonLines = document.querySelector("#local-session-attempt-comparison-lines");
const localLiveRoomCreateButton = document.getElementById("local-live-room-create");
const localLiveRoomRefreshButton = document.getElementById("local-live-room-refresh");
const localLiveRoomSubmitButton = document.getElementById("local-live-room-submit");
const localLiveRoomCleanupButton = document.getElementById("local-live-room-cleanup");
const localLiveRoomJigglyActionInput = document.getElementById("local-live-room-jiggly-action");
const localLiveRoomMoltieActionInput = document.getElementById("local-live-room-moltie-action");
const localLiveRoomJigglyActionStatus = document.getElementById("local-live-room-jiggly-action-status");
const localLiveRoomMoltieActionStatus = document.getElementById("local-live-room-moltie-action-status");
const localLiveRoomStatus = document.getElementById("local-live-room-status");
const localLiveRoomParticipants = document.getElementById("local-live-room-participants");
const localLiveRoomEvents = document.getElementById("local-live-room-events");
const localLiveRoomExamples = document.getElementById("local-live-room-examples");
const groupPlayStats = document.getElementById("group-play-stats");
const replayAutoplayToggle = document.getElementById("replay-autoplay-toggle");
const replayAutoplayStatus = document.getElementById("replay-autoplay-status");
const localSessionTranscriptEntries = [];
const fixturePicker = document.getElementById("fixture-picker");
const catalogFilter = document.getElementById("catalog-filter");
const catalogFilterStatus = document.getElementById("catalog-filter-status");
const evidenceFilter = document.getElementById("evidence-filter");
const evidenceFilterStatus = document.getElementById("evidence-filter-status");

const tileSymbols = new Map([
  ["flower", "✿"],
  ["lamp", "◉"],
  ["path", "▱"],
  ["snack", "◍"],
  ["portal", "◇"],
  ["pixel-block", "▣"],
]);

const agentVisuals = [
  { symbol: "🦞", label: "coral", paletteClass: "agent-palette-0" },
  { symbol: "🫧", label: "bubble", paletteClass: "agent-palette-1" },
  { symbol: "🦀", label: "crab", paletteClass: "agent-palette-2" },
  { symbol: "🌿", label: "moss", paletteClass: "agent-palette-3" },
  { symbol: "✨", label: "spark", paletteClass: "agent-palette-4" },
  { symbol: "⭐", label: "star", paletteClass: "agent-palette-5" },
  { symbol: "🌙", label: "moon", paletteClass: "agent-palette-6" },
  { symbol: "🔥", label: "ember", paletteClass: "agent-palette-7" },
];

function agentVisualFor(agentId, agents = []) {
  const agentIds = agents.map((agent) => (typeof agent === "string" ? agent : agent.agent_id));
  const knownIndex = agentIds.indexOf(agentId);
  const fallbackIndex = Array.from(agentId).reduce((total, character) => total + character.charCodeAt(0), 0);
  return agentVisuals[(knownIndex >= 0 ? knownIndex : fallbackIndex) % agentVisuals.length];
}

function positionKey(position) {
  return `${position.x},${position.y}`;
}

function formatPosition(position) {
  return `(${position.x},${position.y})`;
}

function makeListItem(text) {
  const item = document.createElement("li");
  item.textContent = text;
  return item;
}

function renderFixtureDetails({ fixture = null, localFileName = null, payload = null } = {}) {
  const items = [];
  if (fixture) {
    items.push("Source: Catalog fixture");
    items.push(`Title: ${fixture.title}`);
    items.push(`Path: ${fixture.path}`);
    items.push(`Participants: ${fixture.participants.join(", ")}`);
    items.push(`Summary: ${fixture.summary}`);
  } else if (localFileName && payload) {
    const agentIds = payload.replay?.agent_ids || [];
    items.push("Source: Local replay file");
    items.push(`File: ${localFileName}`);
    items.push(`Participants: ${agentIds.join(", ") || "none"}`);
    items.push(`Replay turns: ${payload.replay?.turns?.length || 0}`);
  } else {
    items.push("Selected fixture details will appear here.");
  }

  fixtureDetails.replaceChildren(...items.map((text) => makeListItem(text)));
}

function renderReplayReviewChecklist(payload, { currentFixture = null, localFileName = null, sourceLabel = "Catalog fixture" } = {}) {
  const finalSnapshot = payload.snapshots[payload.snapshots.length - 1];
  const finalObservation = finalSnapshot.observation;
  const replayTurns = payload.replay.turns.length;
  const storyStatus = payload.story_markdown.trim() === "" ? "no story recap" : "story recap present";
  const eventCount = payload.replay.turns.reduce((total, turn) => total + turn.events.length, 0);
  const participantIds = payload.replay.agent_ids.join(", ") || "none";
  const provenance = currentFixture
    ? `Fixture provenance: ${sourceLabel} ${currentFixture.title} from ${currentFixture.path}.`
    : `Fixture provenance: ${sourceLabel} ${localFileName ?? "unnamed local replay file"}.`;
  const lines = [
    provenance,
    `Story and event evidence: ${storyStatus}; ${eventCount} events across ${replayTurns} replay turns.`,
    `Participant and final-state evidence: participants ${participantIds}; final turn ${finalSnapshot.turn}; resources ${finalObservation.resources.length}; decorations ${finalObservation.decorations.length}; notes ${finalObservation.notes.length}; quest cards ${finalObservation.quests.length}.`,
    "Local-only boundaries: this checklist does not upload files, edit replays in the browser, host a public demo, or add quest completion/rewards.",
  ];

  replayReviewChecklist.replaceChildren(...lines.map((text) => makeListItem(text)));
}

function renderFixturePromotionStatus() {
  if (currentFixture) {
    fixturePromotionStatus.textContent = `Catalog-backed fixture: ${currentFixture.title} (${currentFixture.path}). Already committed; update docs/tests if changing it.`;
    return;
  }

  if (currentLocalFileName) {
    fixturePromotionStatus.textContent = `Local replay file: ${currentLocalFileName}. Promote only after canonical builder equality tests, catalog update, docs update, and local verification.`;
    return;
  }

  fixturePromotionStatus.textContent = "Promotion status will appear after a replay loads.";
}

function buildReplayValidationResults(payload) {
  const formatOk = payload.format === "agent-playground.viewer-replay.v1";
  const snapshotCountOk = payload.snapshots.length === payload.replay.turns.length + 1;
  const participantMetadataOk = Array.isArray(payload.replay.agent_ids) && payload.replay.agent_ids.length > 0;
  const finalSnapshot = payload.snapshots[payload.snapshots.length - 1];
  const finalSnapshotOk = Boolean(finalSnapshot?.observation);
  const participantLabel = participantMetadataOk ? payload.replay.agent_ids.join(", ") : "none";

  return [
    formatOk ? "Format string: pass" : `Format string: warn — got ${payload.format ?? "missing"}`,
    snapshotCountOk
      ? "Snapshot count: pass"
      : `Snapshot count: warn — ${payload.snapshots.length} snapshots for ${payload.replay.turns.length} replay turns`,
    participantMetadataOk ? `Participant metadata: pass — ${participantLabel}` : "Participant metadata: warn — no replay.agent_ids found",
    finalSnapshotOk ? `Final snapshot: pass — turn ${finalSnapshot.turn}` : "Final snapshot: warn — final observation missing",
    "Local-only: validation reads the already loaded replay in this browser and does not upload or write files.",
  ];
}

function renderReplayValidation(payload) {
  const items = buildReplayValidationResults(payload).map((line) => {
    const item = document.createElement("li");
    item.textContent = line;
    return item;
  });
  replayValidationResults.replaceChildren(...items);
}

function renderReplayMetadata(payload) {
  const replayMetadata = document.querySelector("#replay-metadata");
  const lines = [
    `Replay format: ${payload.format}`,
    `Seed: ${payload.replay.seed}`,
    `Dimensions: ${payload.replay.width}×${payload.replay.height}`,
    `Resource count: ${payload.replay.resource_count}`,
    `Participant IDs: ${payload.replay.agent_ids.join(", ")}`,
    `Replay turns: ${payload.replay.turns.length}`,
    `Snapshots: ${payload.snapshots.length}`,
  ];

  const items = lines.map((line) => {
    const item = document.createElement("li");
    item.textContent = line;
    return item;
  });
  replayMetadata.replaceChildren(...items);
}

function renderStateSummary(snapshot) {
  const stateSummary = document.querySelector("#state-summary");
  const observation = snapshot.observation;
  const lines = [
    `Turn: ${snapshot.turn}`,
    `Room size: ${observation.width}×${observation.height}`,
    `Participants: ${observation.agents.length}`,
    `Resources remaining: ${snapshot.observation.resources.length}`,
    `Decorations: ${snapshot.observation.decorations.length}`,
    `Notes: ${snapshot.observation.notes.length}`,
    `Quest cards: ${snapshot.observation.quests.length}`,
  ];

  const items = lines.map((line) => {
    const item = document.createElement("li");
    item.textContent = line;
    return item;
  });
  stateSummary.replaceChildren(...items);
}

function mapByPosition(items) {
  const byPosition = new Map();
  for (const item of items) {
    byPosition.set(positionKey(item.position), item);
  }
  return byPosition;
}

function describeCell(snapshot, key) {
  const observation = snapshot.observation;
  const agents = mapByPosition(observation.agents);
  const resources = mapByPosition(observation.resources);
  const decorations = mapByPosition(observation.decorations);
  const notes = mapByPosition(observation.notes);
  const [x, y] = key.split(",").map(Number);

  return [
    `Selected cell: (${x},${y})`,
    agents.has(key) ? `Agent: ${agents.get(key).agent_id} score ${agents.get(key).score}` : "No agent on this cell.",
    resources.has(key) ? `Resource: ${resources.get(key).resource_id} value ${resources.get(key).value}` : "No resource on this cell.",
    decorations.has(key) ? `Decoration: ${decorations.get(key).tile}` : "No decoration on this cell.",
    notes.has(key) ? `Note: ${notes.get(key).author_id} — ${notes.get(key).message}` : "No note on this cell.",
  ];
}

function renderCellInspector(snapshot) {
  const inspector = document.querySelector("#cell-inspector");
  const items = describeCell(snapshot, selectedCellKey).map((line) => {
    const item = document.createElement("li");
    item.textContent = line;
    return item;
  });
  inspector.replaceChildren(...items);
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Could not load ${path}: ${response.status}`);
  }
  return response.json();
}

async function postJson(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Could not post ${path}: ${response.status}`);
  }
  return data;
}

async function deleteJson(path) {
  const response = await fetch(path, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Could not delete ${path}: ${response.status}`);
  }
  return data;
}

function renderLocalLiveActionExamples(session) {
  const examples = session.legal_action_examples || [];
  if (examples.length === 0) {
    localLiveRoomExamples.replaceChildren(makeListItem("No live action examples returned by the local session API."));
    return;
  }

  const exampleItems = examples.map((example) => makeListItem(`${JSON.stringify(example)} — backend-provided legal action example.`));
  localLiveRoomExamples.replaceChildren(
    ...exampleItems,
    makeListItem("Local-only: examples are submitted only to this in-memory localhost session, never uploaded or sent to public multiplayer."),
  );
}

function renderLocalLiveRoom(session) {
  currentLocalLiveSessionId = session.session_id;
  localLiveRoomStatus.textContent = `Local live session ${session.session_id} at turn ${session.turn}. ${session.boundary}`;

  const participantItems = session.observation.agents.map((agent) =>
    makeListItem(`${agent.agent_id} at ${formatPosition(agent.position)} score ${agent.score}`),
  );
  localLiveRoomParticipants.replaceChildren(...participantItems);
  renderLocalLiveActionExamples(session);

  const submittedTurns = session.submitted_turns || [];
  if (submittedTurns.length === 0) {
    localLiveRoomEvents.replaceChildren(makeListItem("No live actions submitted yet. This local room is in-memory and localhost-only."));
    return;
  }

  const eventItems = submittedTurns
    .flatMap((turn) => turn.events.map((event) => `Turn ${turn.turn}: ${describeEvent(event)}`))
    .map((line) => makeListItem(line));
  localLiveRoomEvents.replaceChildren(...eventItems);
}

async function createLocalLiveSession() {
  localLiveRoomStatus.textContent = "Creating an in-memory localhost live session…";
  try {
    const session = await postJson("/api/local-session", {
      agent_ids: ["jiggly", "moltie"],
      viewer_agent_id: "jiggly",
      seed: 2,
      width: 4,
      height: 4,
      resource_count: 2,
    });
    renderLocalLiveRoom(session);
  } catch (error) {
    currentLocalLiveSessionId = null;
    localLiveRoomStatus.textContent = `Could not create local live session: ${error.message}`;
    localLiveRoomParticipants.replaceChildren(makeListItem("No live-room participants loaded."));
    localLiveRoomEvents.replaceChildren(makeListItem("No live-room events loaded."));
    localLiveRoomExamples.replaceChildren(makeListItem("No live action examples loaded."));
  }
}

async function refreshLocalLiveRoom() {
  if (!currentLocalLiveSessionId) {
    localLiveRoomStatus.textContent = "No local live session to refresh yet.";
    return;
  }

  localLiveRoomStatus.textContent = `Refreshing local live session ${currentLocalLiveSessionId}…`;
  try {
    const session = await loadJson(`/api/local-session/${currentLocalLiveSessionId}`);
    renderLocalLiveRoom(session);
  } catch (error) {
    localLiveRoomStatus.textContent = `Could not refresh local live session: ${error.message}`;
  }
}

function parseLocalLiveActionInput(input, agentId) {
  let action;
  try {
    action = JSON.parse(input.value);
  } catch (error) {
    throw new Error(`Local live action JSON is malformed for ${agentId}: ${error.message}`);
  }

  if (!action || Array.isArray(action) || typeof action !== "object" || typeof action.type !== "string" || action.type.trim() === "") {
    throw new Error(`Local live action for ${agentId} must be a JSON object with a string type.`);
  }

  const schemaErrors = validateSandboxAction(action);
  if (schemaErrors.length > 0) {
    throw new Error(`Local live action for ${agentId} failed schema validation: ${schemaErrors[0]}`);
  }

  return action;
}

function localLiveActionStatusForAgent(agentId) {
  return agentId === "jiggly" ? localLiveRoomJigglyActionStatus : localLiveRoomMoltieActionStatus;
}

function renderLocalLiveActionInputStatus(agentId, result) {
  const status = localLiveActionStatusForAgent(agentId);
  if (!status) {
    return;
  }

  status.classList.remove("local-live-room-action-status--ok", "local-live-room-action-status--error");
  status.classList.add(result.ok ? "local-live-room-action-status--ok" : "local-live-room-action-status--error");
  status.textContent = result.message;
}

function validateLocalLiveActionInputStatus(input, agentId) {
  try {
    parseLocalLiveActionInput(input, agentId);
    renderLocalLiveActionInputStatus(agentId, { ok: true, message: `valid local live action JSON for ${agentId}` });
  } catch (error) {
    renderLocalLiveActionInputStatus(agentId, { ok: false, message: error.message });
  }
}

function validateLocalLiveActionsPayload() {
  let jigglyAction;
  let moltieAction;
  const errors = [];

  try {
    jigglyAction = parseLocalLiveActionInput(localLiveRoomJigglyActionInput, "jiggly");
    renderLocalLiveActionInputStatus("jiggly", { ok: true, message: "valid local live action JSON for jiggly" });
  } catch (error) {
    errors.push(error);
    renderLocalLiveActionInputStatus("jiggly", { ok: false, message: error.message });
  }

  try {
    moltieAction = parseLocalLiveActionInput(localLiveRoomMoltieActionInput, "moltie");
    renderLocalLiveActionInputStatus("moltie", { ok: true, message: "valid local live action JSON for moltie" });
  } catch (error) {
    errors.push(error);
    renderLocalLiveActionInputStatus("moltie", { ok: false, message: error.message });
  }

  if (errors.length > 0) {
    throw errors[0];
  }

  return {
    jiggly: jigglyAction,
    moltie: moltieAction,
  };
}

function buildLocalLiveActionsPayload(actionsByAgent) {
  return {
    actions: actionsByAgent,
  };
}

async function submitLocalLiveActions() {
  if (!currentLocalLiveSessionId) {
    localLiveRoomStatus.textContent = "No local live session to submit actions to yet.";
    return;
  }

  let actionsByAgent;
  try {
    actionsByAgent = validateLocalLiveActionsPayload();
  } catch (error) {
    localLiveRoomStatus.textContent = `safe client-side validation error before contacting the localhost API: ${error.message}`;
    return;
  }

  localLiveRoomStatus.textContent = `Submitting local live actions to ${currentLocalLiveSessionId}…`;
  try {
    const stepResult = await postJson(
      `/api/local-session/${currentLocalLiveSessionId}/actions`,
      buildLocalLiveActionsPayload(actionsByAgent),
    );
    const session = await loadJson(`/api/local-session/${stepResult.session_id}`);
    renderLocalLiveRoom(session);
  } catch (error) {
    localLiveRoomStatus.textContent = `Could not submit local live actions: ${error.message}`;
  }
}

async function verifyLocalLiveSessionDeleted(sessionId) {
  try {
    await loadJson(`/api/local-session/${sessionId}`);
    return "Cleanup readback warning: deleted local live session was still readable.";
  } catch (error) {
    if (String(error.message).includes("404")) {
      return "Cleanup readback confirmed JSON 404 for the deleted in-memory localhost session.";
    }
    return `Cleanup readback warning: ${error.message}`;
  }
}

async function cleanupLocalLiveRoom() {
  if (!currentLocalLiveSessionId) {
    localLiveRoomStatus.textContent = "No local live session to delete yet.";
    return;
  }

  const sessionId = currentLocalLiveSessionId;
  localLiveRoomStatus.textContent = `Deleting local live session ${sessionId} from the in-memory localhost server…`;
  try {
    await deleteJson(`/api/local-session/${sessionId}`);
    const readbackEvidence = await verifyLocalLiveSessionDeleted(sessionId);
    currentLocalLiveSessionId = null;
    localLiveRoomStatus.textContent = `Local live session deleted from this in-memory localhost server: ${sessionId}. ${readbackEvidence} no-session/cleared local-only copy is now displayed. No public room, account, stored data, or replay fixture was deleted.`;
    localLiveRoomParticipants.replaceChildren(makeListItem("No local live-room participants loaded."));
    localLiveRoomEvents.replaceChildren(makeListItem("Local live-room events cleared after in-memory session cleanup."));
    localLiveRoomExamples.replaceChildren(makeListItem("No live action examples loaded after cleanup."));
  } catch (error) {
    localLiveRoomStatus.textContent = `Could not delete local live session: ${error.message}`;
  }
}

function renderGrid(snapshot) {
  const observation = snapshot.observation;
  const grid = document.querySelector("#grid");
  const agents = mapByPosition(observation.agents);
  const resources = mapByPosition(observation.resources);
  const decorations = mapByPosition(observation.decorations);
  const notes = mapByPosition(observation.notes);

  grid.style.gridTemplateColumns = `repeat(${observation.width}, 2.75rem)`;

  const cells = [];
  for (let y = 0; y < observation.height; y += 1) {
    for (let x = 0; x < observation.width; x += 1) {
      const key = `${x},${y}`;
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.positionKey = key;
      cell.classList.toggle("cell--selected", key === selectedCellKey);
      cell.addEventListener("click", () => {
        selectedCellKey = key;
        renderGrid(snapshot);
        renderCellInspector(snapshot);
      });

      const labels = [`(${x},${y})`];
      const markers = [];

      const decoration = decorations.get(key);
      if (decoration) {
        cell.classList.add("cell--decoration");
        labels.push(`decoration ${decoration.tile}`);
        markers.push(tileSymbols.get(decoration.tile) ?? "◆");
      }

      const resource = resources.get(key);
      if (resource) {
        cell.classList.add("cell--resource");
        labels.push(`resource ${resource.resource_id}`);
        markers.push("●");
      }

      const note = notes.get(key);
      if (note) {
        cell.classList.add("cell--note");
        labels.push(`note by ${note.author_id}: ${note.message}`);
        markers.push("✎");
      }

      const agent = agents.get(key);
      if (agent) {
        const visual = agentVisualFor(agent.agent_id, observation.agents);
        cell.classList.add("cell--agent");
        cell.classList.add(visual.paletteClass);
        labels.push(`agent ${agent.agent_id} score ${agent.score} ${visual.label} badge`);
        markers.push(visual.symbol);
      }

      if (markers.length === 0) {
        cell.classList.add("cell--empty");
        markers.push("·");
      }

      cell.setAttribute("aria-label", labels.join(", "));
      cell.title = labels.join(", ");
      cell.textContent = markers.join(" ");
      cells.push(cell);
    }
  }

  grid.replaceChildren(...cells);
}

function renderParticipants(snapshot) {
  const participants = document.querySelector("#participants");
  const agents = snapshot.observation.agents;

  if (agents.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No participants in this snapshot.";
    participants.replaceChildren(item);
    return;
  }

  const items = agents.map((agent) => {
    const item = document.createElement("li");
    item.textContent = `${agent.agent_id} at ${formatPosition(agent.position)} score ${agent.score}`;
    return item;
  });
  participants.replaceChildren(...items);
}

function renderPartyRoster(snapshot) {
  const partyRoster = document.querySelector("#party-roster");
  const agents = snapshot.observation.agents;

  if (agents.length === 0) {
    partyRoster.replaceChildren(makeListItem("No agents in this party yet."));
    return;
  }

  const items = agents.map((agent) => {
    const visual = agentVisualFor(agent.agent_id, agents);
    const item = document.createElement("li");
    item.classList.add(visual.paletteClass);

    const badge = document.createElement("span");
    badge.classList.add("party-roster-badge", visual.paletteClass);
    badge.textContent = visual.symbol;

    const label = document.createElement("span");
    label.textContent = `${agent.agent_id} — ${visual.label} badge, score ${agent.score}, ${formatPosition(agent.position)}`;

    item.replaceChildren(badge, label);
    return item;
  });
  partyRoster.replaceChildren(...items);
}

function groupSizeLabelFor(count) {
  if (count <= 1) {
    return `solo (${count})`;
  }
  if (count <= 3) {
    return `small group (${count})`;
  }
  if (count <= 8) {
    return `medium group (${count})`;
  }
  return `large swarm (${count})`;
}

function summarizeActionMix(payload) {
  const counts = new Map();
  for (const turn of payload.replay.turns) {
    for (const action of Object.values(turn.actions)) {
      counts.set(action.type, (counts.get(action.type) ?? 0) + 1);
    }
  }

  if (counts.size === 0) {
    return "none yet";
  }

  return Array.from(counts.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([actionType, count]) => `${actionType}×${count}`)
    .join(", ");
}

function renderGroupPlayStats(payload, snapshotIndex) {
  const snapshot = payload.snapshots[snapshotIndex];
  const observation = snapshot.observation;
  const groupSizeLabel = groupSizeLabelFor(observation.agents.length);
  const totalScore = observation.agents.reduce((sum, agent) => sum + agent.score, 0);
  const scoreboardLeader = observation.agents
    .slice()
    .sort((left, right) => right.score - left.score || left.agent_id.localeCompare(right.agent_id))[0];
  const scoreboardLine = scoreboardLeader
    ? `Scoreboard leader: ${scoreboardLeader.agent_id} with ${scoreboardLeader.score}`
    : "Scoreboard leader: none yet";
  const lines = [
    `Group size: ${groupSizeLabel}`,
    `Total score: ${totalScore}`,
    scoreboardLine,
    `Action mix: ${summarizeActionMix(payload)}`,
    `Room objects: ${observation.resources.length} resources, ${observation.decorations.length} decorations, ${observation.notes.length} notes, ${observation.quests.length} quest cards`,
    "Local-only: these stats summarize the loaded replay and do not prove live multiplayer, persistence, upload, or public hosting.",
  ];

  groupPlayStats.replaceChildren(...lines.map((line) => makeListItem(line)));
}

function describeAction(agentId, action) {
  if (action.type === "move") {
    return `${agentId}: move ${action.direction}`;
  }
  if (action.type === "say") {
    return `${agentId}: say ${action.message}`;
  }
  if (action.type === "place_tile") {
    return `${agentId}: place_tile ${action.tile}`;
  }
  if (action.type === "leave_note") {
    return `${agentId}: leave_note ${action.message}`;
  }
  if (action.type === "create_quest") {
    return `${agentId}: create_quest ${action.title} — ${action.description}`;
  }
  if (action.type === "gather") {
    return `${agentId}: gather`;
  }
  if (action.type === "wait") {
    return `${agentId}: wait`;
  }
  return `${agentId}: ${action.type}`;
}

function renderTurnActions(turn) {
  const turnActions = document.querySelector("#turn-actions");
  if (!turn) {
    const item = document.createElement("li");
    item.textContent = "No submitted actions for the initial snapshot.";
    turnActions.replaceChildren(item);
    return;
  }

  const items = Object.entries(turn.actions).map(([agentId, action]) => {
    const item = document.createElement("li");
    item.textContent = describeAction(agentId, action);
    return item;
  });
  turnActions.replaceChildren(...items);
}

function buildActionPreviewExamples(snapshot) {
  const agentId = snapshot.observation.self.agent_id;
  const selfPositionKey = positionKey(snapshot.observation.self.position);
  const hasResourceHere = snapshot.observation.resources.some((resource) => positionKey(resource.position) === selfPositionKey);
  const lines = [
    `Observing agent: ${agentId}`,
    '{"type":"wait"} — legal no-op action.',
    '{"type":"say","message":"hello grove"} — cozy chat example.',
  ];

  if (hasResourceHere) {
    lines.push('{"type":"gather"} — gather a resource on the observing agent tile.');
  }

  lines.push(
    '{"type":"move","direction":"N"} — example move north; also try S/E/W when useful.',
    '{"type":"place_tile","tile":"flower"} — example local decoration action.',
    "Preview only: actions shown here are not submitted, saved, uploaded, or sent to a live multiplayer server.",
  );
  return lines;
}

function renderActionPreview(snapshot) {
  const items = buildActionPreviewExamples(snapshot).map((line) => {
    const item = document.createElement("li");
    item.textContent = line;
    return item;
  });
  actionPreviewExamples.replaceChildren(...items);
}

function parseActionSandboxInput(rawText) {
  try {
    const action = JSON.parse(rawText);
    if (typeof action !== "object" || action === null || Array.isArray(action)) {
      return { ok: false, lines: ["Action JSON must be a single object."] };
    }
    return { ok: true, action };
  } catch (error) {
    return { ok: false, lines: [`Action JSON parse error: ${error.message}`] };
  }
}

function nonblankString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function validateSandboxAction(action) {
  if (!nonblankString(action.type)) {
    return ["Action type is required."];
  }

  if (action.type === "wait" || action.type === "gather") {
    return [];
  }
  if (action.type === "move") {
    return ["N", "S", "E", "W"].includes(action.direction) ? [] : ["Move action requires direction N, S, E, or W."];
  }
  if (action.type === "say" || action.type === "leave_note") {
    return nonblankString(action.message) ? [] : [`${action.type} action requires a nonblank message.`];
  }
  if (action.type === "place_tile") {
    return nonblankString(action.tile) ? [] : ["place_tile action requires a nonblank tile."];
  }
  if (action.type === "create_quest") {
    const errors = [];
    if (!nonblankString(action.title)) {
      errors.push("create_quest action requires a nonblank title.");
    }
    if (!nonblankString(action.description)) {
      errors.push("create_quest action requires a nonblank description.");
    }
    return errors;
  }
  return [`Unknown action type: ${action.type}`];
}

function buildActionSandboxPreviewLines(action, snapshot) {
  const lines = [`Action JSON is valid: ${action.type}`];
  const selfPositionKey = positionKey(snapshot.observation.self.position);

  if (action.type === "wait") {
    lines.push("This would wait on the selected turn without moving or changing cozy room state.");
  } else if (action.type === "gather") {
    const resource = snapshot.observation.resources.find((item) => positionKey(item.position) === selfPositionKey);
    if (resource) {
      lines.push(`This would gather resource ${resource.resource_id} from ${formatPosition(resource.position)} for ${resource.value}.`);
    } else {
      lines.push("This would gather nothing on this tile because no resource is under the observing agent.");
    }
  } else if (action.type === "say") {
    lines.push(`This would be a chat event from ${snapshot.observation.self.agent_id}: ${action.message.trim()}`);
  } else if (action.type === "place_tile") {
    lines.push(`This would preview placing ${action.tile.trim()} at ${formatPosition(snapshot.observation.self.position)}.`);
  } else if (action.type === "leave_note") {
    lines.push(`This would preview leaving a note at ${formatPosition(snapshot.observation.self.position)}: ${action.message.trim()}`);
  } else if (action.type === "create_quest") {
    lines.push(`This would preview an open descriptive quest card: ${action.title.trim()} — ${action.description.trim()}`);
  } else if (action.type === "move") {
    lines.push(`This would preview one ${action.direction} move from ${formatPosition(snapshot.observation.self.position)}; it is not live pathfinding or server validation.`);
  }

  lines.push("Preview only: no state is changed, saved, uploaded, or sent to a live multiplayer server.");
  return lines;
}

function findResourceAtPosition(resources, position) {
  return resources.find((resource) => positionKey(resource.position) === positionKey(position));
}

function estimateMoveTarget(position, direction) {
  const target = { x: position.x, y: position.y };
  if (direction === "N") {
    target.y -= 1;
  } else if (direction === "S") {
    target.y += 1;
  } else if (direction === "E") {
    target.x += 1;
  } else if (direction === "W") {
    target.x -= 1;
  }
  return target;
}

function buildActionResultPreviewLines(action, snapshot) {
  const nextTurn = snapshot.turn + 1;
  const observation = snapshot.observation;
  const self = observation.self;
  const selfPosition = self.position;
  const lines = ["Hypothetical next-state diff"];

  if (action.type === "wait") {
    lines.push(`wait would advance to turn ${nextTurn} with no visible position, resource, note, quest, decoration, or score change.`);
  } else if (action.type === "say") {
    lines.push(`say would emit a say event from ${self.agent_id}: ${action.message.trim()}`);
    lines.push("Agent positions and room resources would stay unchanged.");
  } else if (action.type === "gather") {
    const resource = findResourceAtPosition(observation.resources, selfPosition);
    if (resource) {
      lines.push(`gather would remove resource ${resource.resource_id} from ${formatPosition(resource.position)}.`);
      lines.push(`gather would add 1 score to ${self.agent_id} (resource value ${resource.value}).`);
    } else {
      lines.push(`gather would emit gather_empty at ${formatPosition(selfPosition)} because no resource is under ${self.agent_id}.`);
    }
  } else if (action.type === "place_tile") {
    const decorationId = `turn-${snapshot.turn}-${self.agent_id}-${action.tile.trim()}`;
    lines.push(`place_tile would add decoration ${decorationId} (${action.tile.trim()}) at ${formatPosition(selfPosition)}.`);
  } else if (action.type === "leave_note") {
    const noteId = `turn-${snapshot.turn}-${self.agent_id}-note`;
    lines.push(`leave_note would add note ${noteId} at ${formatPosition(selfPosition)}: ${action.message.trim()}`);
  } else if (action.type === "create_quest") {
    const questId = `turn-${snapshot.turn}-${self.agent_id}-quest`;
    lines.push(`create_quest would add open quest card ${questId}: ${action.title.trim()} — ${action.description.trim()}`);
    lines.push("Quest cards remain descriptive prompts only; this would not add completion or reward mechanics.");
  } else if (action.type === "move") {
    const target = estimateMoveTarget(selfPosition, action.direction);
    lines.push(`move would move from ${formatPosition(selfPosition)} to ${formatPosition(target)} as a local estimate.`);
    lines.push("Move preview is not live pathfinding/server validation and may differ from future server rules.");
  }

  lines.push("Preview only: no replay state is changed, saved, uploaded, or sent to a live multiplayer server.");
  return lines;
}

function renderActionResultPreview() {
  const parsed = parseActionSandboxInput(actionSandboxInput.value);
  const lines = [];

  if (!parsed.ok) {
    lines.push(...parsed.lines);
  } else {
    const validationErrors = validateSandboxAction(parsed.action);
    if (validationErrors.length > 0) {
      lines.push(...validationErrors);
    } else if (currentPayload) {
      const currentSnapshot = currentPayload.snapshots[currentSnapshotIndex];
      lines.push(...buildActionResultPreviewLines(parsed.action, currentSnapshot));
    } else {
      lines.push("Hypothetical next-state diff will appear after a replay loads.");
    }
  }

  if (!lines.some((line) => line.startsWith("Preview only:"))) {
    lines.push("Preview only: no replay state is changed, saved, uploaded, or sent to a live multiplayer server.");
  }

  actionResultPreviewLines.replaceChildren(...lines.map((line) => makeListItem(line)));
  actionResultPreviewStatus.textContent = "Preview only: this does not submit, save, upload, mutate replay state, or contact a live multiplayer server.";
}

function cloneObservationForRehearsal(observation) {
  return JSON.parse(JSON.stringify(observation));
}

function buildActionRehearsalSummaryLines(action, snapshot) {
  const nextTurn = snapshot.turn + 1;
  const observation = cloneObservationForRehearsal(snapshot.observation);
  const self = observation.self;
  const selfPosition = self.position;
  const lines = ["Hypothetical after-state summary"];

  if (action.type === "wait") {
    lines.push(`after-state turn would be ${nextTurn}; visible position, score, resources, notes, quests, and decorations would remain unchanged.`);
  } else if (action.type === "say") {
    lines.push(`after-state would include a say event from ${self.agent_id}: ${action.message.trim()}`);
    lines.push("Positions, scores, resources, notes, quests, and decorations would remain unchanged.");
  } else if (action.type === "gather") {
    const resource = findResourceAtPosition(observation.resources, selfPosition);
    if (resource) {
      lines.push(`after-state score would be ${self.score + resource.value} for ${self.agent_id}.`);
      lines.push(`after-state resources remaining would be ${Math.max(0, observation.resources.length - 1)} after gathering ${resource.resource_id}.`);
    } else {
      lines.push(`after-state score would be ${self.score}; gather_empty would leave score unchanged.`);
      lines.push(`after-state resources remaining would be ${observation.resources.length} because no resource is under ${self.agent_id}.`);
    }
  } else if (action.type === "place_tile") {
    const decorationId = `turn-${snapshot.turn}-${self.agent_id}-${action.tile.trim()}`;
    lines.push(`after-state decorations would include ${decorationId} (${action.tile.trim()}) at ${formatPosition(selfPosition)}.`);
  } else if (action.type === "leave_note") {
    const noteId = `turn-${snapshot.turn}-${self.agent_id}-note`;
    lines.push(`after-state notes would include ${noteId} by ${self.agent_id} at ${formatPosition(selfPosition)}: ${action.message.trim()}`);
  } else if (action.type === "create_quest") {
    const questId = `turn-${snapshot.turn}-${self.agent_id}-quest`;
    lines.push(`after-state quest cards would include ${questId} (open): ${action.title.trim()} — ${action.description.trim()}`);
    lines.push("Quest cards remain descriptive prompts only; after-state rehearsal does not add completion or reward mechanics.");
  } else if (action.type === "move") {
    const target = estimateMoveTarget(selfPosition, action.direction);
    lines.push(`after-state position estimate would be ${formatPosition(target)} after moving ${action.direction} from ${formatPosition(selfPosition)}.`);
    lines.push("Move after-state rehearsal is not live pathfinding/server validation and may differ from future server rules.");
  }

  lines.push("Preview only: no replay state is changed, saved, uploaded, or sent to a live multiplayer server.");
  return lines;
}

function renderActionRehearsal() {
  const parsed = parseActionSandboxInput(actionSandboxInput.value);
  const lines = [];

  if (!parsed.ok) {
    lines.push(...parsed.lines);
  } else {
    const validationErrors = validateSandboxAction(parsed.action);
    if (validationErrors.length > 0) {
      lines.push(...validationErrors);
    } else if (currentPayload) {
      const currentSnapshot = currentPayload.snapshots[currentSnapshotIndex];
      lines.push(...buildActionRehearsalSummaryLines(parsed.action, currentSnapshot));
    } else {
      lines.push("Hypothetical after-state summary will appear after a replay loads.");
    }
  }

  if (!lines.some((line) => line.startsWith("Preview only:"))) {
    lines.push("Preview only: no replay state is changed, saved, uploaded, or sent to a live multiplayer server.");
  }

  actionRehearsalSummary.replaceChildren(...lines.map((line) => makeListItem(line)));
  actionRehearsalStatus.textContent = "Preview only: this does not submit, save, upload, mutate replay state, or contact a live multiplayer server.";
}

function cloneObservationForLocalRunner(observation) {
  if (typeof structuredClone === "function") {
    return structuredClone(observation);
  }
  return JSON.parse(JSON.stringify(observation));
}

function buildLocalActionRunnerSummaryLines(action, snapshot) {
  const nextTurn = snapshot.turn + 1;
  const observation = cloneObservationForLocalRunner(snapshot.observation);
  const self = observation.self;
  const selfPosition = self.position;
  const lines = ["Hypothetical one-action fork"];

  if (action.type === "wait") {
    lines.push(`local fork turn would be ${nextTurn}; wait keeps visible state unchanged.`);
  } else if (action.type === "say") {
    lines.push(`local fork would include a say event from ${self.agent_id}: ${action.message.trim()}`);
    lines.push(`local fork turn would be ${nextTurn}; positions, scores, resources, notes, quests, and decorations would remain unchanged.`);
  } else if (action.type === "gather") {
    const resource = findResourceAtPosition(observation.resources, selfPosition);
    if (resource) {
      lines.push(`local fork score would be ${self.score + resource.value} for ${self.agent_id}.`);
      lines.push(`local fork resources remaining would be ${Math.max(0, observation.resources.length - 1)} after gathering ${resource.resource_id}.`);
    } else {
      lines.push(`local fork score would be ${self.score}; gather_empty would leave score unchanged.`);
      lines.push(`local fork resources remaining would be ${observation.resources.length} because no resource is under ${self.agent_id}.`);
    }
  } else if (action.type === "move") {
    const target = estimateMoveTarget(selfPosition, action.direction);
    lines.push(`local fork position estimate would be ${formatPosition(target)} after moving ${action.direction} from ${formatPosition(selfPosition)}.`);
    lines.push("Move fork preview is not live pathfinding/server validation and may differ from future server rules.");
  } else if (action.type === "place_tile") {
    const decorationId = `turn-${snapshot.turn}-${self.agent_id}-${action.tile.trim()}`;
    lines.push(`local fork decorations would include ${decorationId} (${action.tile.trim()}) at ${formatPosition(selfPosition)}.`);
  } else if (action.type === "leave_note") {
    const noteId = `turn-${snapshot.turn}-${self.agent_id}-note`;
    lines.push(`local fork notes would include ${noteId} by ${self.agent_id} at ${formatPosition(selfPosition)}: ${action.message.trim()}`);
  } else if (action.type === "create_quest") {
    const questId = `turn-${snapshot.turn}-${self.agent_id}-quest`;
    lines.push(`local fork quest cards would include ${questId} (open): ${action.title.trim()} — ${action.description.trim()}`);
    lines.push("Quest cards remain descriptive prompts only; local forks do not add completion or reward mechanics.");
  }

  lines.push("Preview only: no replay state is changed, saved, uploaded, or sent to a live multiplayer server.");
  return lines;
}

function renderLocalActionRunner(lines) {
  localActionRunnerSummary.replaceChildren(...lines.map((line) => makeListItem(line)));
  localActionRunnerStatus.textContent = "Preview only: this does not submit, save, upload, mutate replay state, or contact a live multiplayer server.";
}

function buildLocalSessionTranscriptLabel() {
  if (currentFixture) {
    return `fixture ${currentFixture.title}`;
  }
  if (currentLocalFileName) {
    return `local file ${currentLocalFileName}`;
  }
  return "no replay loaded";
}

function localSessionTranscriptEntrySearchText(entry) {
  return [
    entry.text,
    entry.sourceLabel,
    entry.turnLabel,
    entry.actionKind,
    entry.valid ? "valid preview" : "error preview",
    entry.outcome,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getLocalSessionTranscriptFilterQuery() {
  return localSessionTranscriptFilterInput ? localSessionTranscriptFilterInput.value : "";
}

function getFilteredLocalSessionTranscriptEntries() {
  const query = getLocalSessionTranscriptFilterQuery().trim().toLowerCase();
  if (query === "") {
    return localSessionTranscriptEntries;
  }
  return localSessionTranscriptEntries.filter((entry) => localSessionTranscriptEntrySearchText(entry).includes(query));
}

function updateLocalSessionTranscriptFilterStatus(filteredEntries) {
  if (!localSessionTranscriptFilterStatus) {
    return;
  }
  const query = getLocalSessionTranscriptFilterQuery().trim();
  const total = localSessionTranscriptEntries.length;
  if (total === 0) {
    localSessionTranscriptFilterStatus.textContent = "No browser-memory transcript entries to filter yet.";
    return;
  }
  if (query === "") {
    localSessionTranscriptFilterStatus.textContent = `Showing all ${total} browser-memory transcript entries.`;
    return;
  }
  localSessionTranscriptFilterStatus.textContent = `Showing ${filteredEntries.length} of ${total} browser-memory transcript entries for "${query}".`;
}

function renderLocalSessionTranscript() {
  if (localSessionTranscriptEntries.length === 0) {
    localSessionTranscriptEntriesList.replaceChildren(makeListItem("No local session transcript entries yet."));
    localSessionTranscriptStatus.textContent = "This local session transcript is ephemeral browser memory only; it does not save, upload, mutate replay state, or contact a live multiplayer server.";
    updateLocalSessionTranscriptFilterStatus([]);
    return;
  }

  const filteredEntries = getFilteredLocalSessionTranscriptEntries();
  if (filteredEntries.length === 0) {
    const query = getLocalSessionTranscriptFilterQuery().trim();
    localSessionTranscriptEntriesList.replaceChildren(makeListItem(`No local session transcript entries match "${query}".`));
    localSessionTranscriptStatus.textContent = `No ephemeral local session transcript entries match the current browser-memory filter; nothing is saved or uploaded.`;
    updateLocalSessionTranscriptFilterStatus(filteredEntries);
    return;
  }

  const items = filteredEntries
    .slice()
    .reverse()
    .map((entry) => makeListItem(entry.text));
  localSessionTranscriptEntriesList.replaceChildren(...items);
  localSessionTranscriptStatus.textContent = `Showing ${filteredEntries.length} of ${localSessionTranscriptEntries.length} ephemeral local session transcript entries; nothing is saved or uploaded.`;
  updateLocalSessionTranscriptFilterStatus(filteredEntries);
}

function buildLocalSessionSummaryLines(entries) {
  if (entries.length === 0) {
    return [
      "No local action attempts summarized yet.",
      "Browser-memory-only summary: nothing is saved, uploaded, persisted, or sent to a live multiplayer server.",
    ];
  }

  const validCount = entries.filter((entry) => entry.valid).length;
  const errorCount = entries.length - validCount;
  const latest = entries[entries.length - 1];
  return [
    `total local attempts: ${entries.length}`,
    `valid previews: ${validCount}`,
    `error previews: ${errorCount}`,
    `latest action: ${latest.actionKind} on ${latest.sourceLabel} at ${latest.turnLabel}`,
    "Browser-memory-only summary: nothing is saved, uploaded, persisted, or sent to a live multiplayer server.",
  ];
}

function renderLocalSessionSummary() {
  if (!localSessionSummaryStatus || !localSessionSummaryLines) {
    return;
  }
  const lines = buildLocalSessionSummaryLines(localSessionTranscriptEntries);
  localSessionSummaryStatus.textContent = lines[0];
  localSessionSummaryLines.replaceChildren(...lines.map((line) => makeListItem(line)));
}

function buildLocalSessionReviewChecklistLines(entries) {
  if (entries.length === 0) {
    return [
      "No local action attempts yet.",
      "Run at least one valid preview and one error or edge-case preview before citing evidence.",
      "Browser-memory-only checklist: no state is saved, uploaded, or sent to a live multiplayer server.",
    ];
  }

  const validCount = entries.filter((entry) => entry.valid).length;
  const errorCount = entries.length - validCount;
  const latest = entries[entries.length - 1];
  return [
    `Total local attempts: ${entries.length}`,
    `Valid previews: ${validCount}`,
    `Error previews: ${errorCount}`,
    `Latest evidence: ${latest.actionKind} from ${latest.sourceLabel} on ${latest.turnLabel}.`,
    "Review before treating local previews as evidence: confirm fixture/source, selected turn, and edge cases.",
    "Browser-memory-only checklist: no state is saved, uploaded, or sent to a live multiplayer server.",
  ];
}

function renderLocalSessionReviewChecklist() {
  if (!localSessionReviewChecklistStatus || !localSessionReviewChecklistItems) {
    return;
  }
  const lines = buildLocalSessionReviewChecklistLines(localSessionTranscriptEntries);
  localSessionReviewChecklistStatus.textContent = `Review before treating local previews as evidence: ${lines[0]}`;
  localSessionReviewChecklistItems.replaceChildren(...lines.map((line) => makeListItem(line)));
}

function buildLocalSessionEvidenceCitationLines(entries) {
  if (entries.length === 0) {
    return [
      "Run local preview attempts before citing local evidence.",
      "Browser-memory-only citation helper: no state is saved, uploaded, copied to clipboard, or sent to a live multiplayer server.",
    ];
  }

  const validCount = entries.filter((entry) => entry.valid).length;
  const errorCount = entries.length - validCount;
  const latest = entries[entries.length - 1];
  return [
    `Citation summary: ${entries.length} local attempts, ${validCount} valid previews, ${errorCount} error previews.`,
    `Source/turn/action: ${latest.sourceLabel}; ${latest.turnLabel}; ${latest.actionKind}.`,
    "Include both valid and error evidence when relevant; confirm fixture/source/turn before citing.",
    "Browser-memory-only citation helper: no state is saved, uploaded, copied to clipboard, or sent to a live multiplayer server.",
  ];
}

function renderLocalSessionEvidenceCitation() {
  if (!localSessionEvidenceCitationStatus || !localSessionEvidenceCitationLines) {
    return;
  }
  const lines = buildLocalSessionEvidenceCitationLines(localSessionTranscriptEntries);
  localSessionEvidenceCitationStatus.textContent = `Quote local preview evidence carefully: ${lines[0]}`;
  localSessionEvidenceCitationLines.replaceChildren(...lines.map((line) => makeListItem(line)));
}

function describeLocalSessionAttemptForComparison(entry) {
  return `${entry.sourceLabel}; ${entry.turnLabel}; ${entry.actionKind}; ${entry.valid ? "valid" : "error"}`;
}

function buildLocalSessionAttemptComparisonLines(entries) {
  if (entries.length === 0) {
    return [
      "Run at least two local preview attempts to compare source, turn, action, and valid/error outcomes.",
      "Browser-memory-only comparison: this does not save, upload, copy to clipboard, mutate replay state, use browser storage, or contact a live multiplayer server.",
    ];
  }

  const latest = entries[entries.length - 1];
  if (entries.length === 1) {
    return [
      "Comparison summary: 1 local attempt available; run one more attempt to compare outcomes.",
      `Latest attempt: ${describeLocalSessionAttemptForComparison(latest)}.`,
      "Browser-memory-only comparison: this does not save, upload, copy to clipboard, mutate replay state, use browser storage, or contact a live multiplayer server.",
    ];
  }

  const previous = entries[entries.length - 2];
  const validCount = entries.filter((entry) => entry.valid).length;
  const errorCount = entries.length - validCount;
  return [
    `Comparison summary: ${entries.length} local attempts in this browser session.`,
    `Latest attempt: ${describeLocalSessionAttemptForComparison(latest)}.`,
    `Previous attempt: ${describeLocalSessionAttemptForComparison(previous)}.`,
    `Valid/error mix: ${validCount} valid previews, ${errorCount} error previews.`,
    "Browser-memory-only comparison: confirm source/turn/action before citing; no state is changed, saved, uploaded, copied, or sent to a live multiplayer server.",
  ];
}

function renderLocalSessionAttemptComparison() {
  if (!localSessionAttemptComparisonStatus || !localSessionAttemptComparisonLines) {
    return;
  }
  const lines = buildLocalSessionAttemptComparisonLines(localSessionTranscriptEntries);
  if (localSessionTranscriptEntries.length === 0) {
    localSessionAttemptComparisonStatus.textContent = "Compare recent local preview attempts: no local action attempts yet.";
  } else if (localSessionTranscriptEntries.length === 1) {
    localSessionAttemptComparisonStatus.textContent = "Compare recent local preview attempts: one attempt available; run another attempt for comparison.";
  } else {
    localSessionAttemptComparisonStatus.textContent = `Compare recent local preview attempts: ${localSessionTranscriptEntries.length} browser-memory attempts available.`;
  }
  localSessionAttemptComparisonLines.replaceChildren(...lines.map((line) => makeListItem(line)));
}

function clearLocalSessionTranscript() {
  localSessionTranscriptEntries.length = 0;
  renderLocalSessionTranscript();
  renderLocalSessionSummary();
  renderLocalSessionReviewChecklist();
  renderLocalSessionEvidenceCitation();
  renderLocalSessionAttemptComparison();
  if (localSessionTranscriptStatus) {
    localSessionTranscriptStatus.textContent = "Transcript cleared for this browser session.";
  }
}

function appendLocalSessionTranscriptEntry({ actionKind, outcome }) {
  const sourceLabel = buildLocalSessionTranscriptLabel();
  const turnLabel = currentPayload ? `turn ${currentPayload.snapshots[currentSnapshotIndex]?.turn ?? currentSnapshotIndex}` : "turn unavailable";
  localSessionTranscriptEntries.push({
    actionKind,
    outcome,
    sourceLabel,
    turnLabel,
    valid: outcome.startsWith("valid preview"),
    text: `${sourceLabel}; ${turnLabel}; ${actionKind}; ${outcome}`,
  });
  if (localSessionTranscriptEntries.length > 8) {
    localSessionTranscriptEntries.shift();
  }
  renderLocalSessionTranscript();
  renderLocalSessionSummary();
  renderLocalSessionReviewChecklist();
  renderLocalSessionEvidenceCitation();
  renderLocalSessionAttemptComparison();
}

function buildLocalSessionTranscriptOutcome(action, snapshot, summaryLines) {
  if (action.type === "wait") {
    return "valid preview: wait";
  }
  if (action.type === "say") {
    return `valid preview: say ${action.message.trim()}`;
  }

  const observation = snapshot.observation;
  const self = observation.self;
  const stateLabel = `score ${self.score}; resources ${observation.resources.length}; position ${formatPosition(self.position)}`;
  const firstEvidenceLine = summaryLines.find((line) => line.startsWith("local fork ")) ?? "local fork preview ready";

  if (action.type === "gather") {
    return `valid preview: gather; ${stateLabel}; ${firstEvidenceLine}`;
  }
  if (action.type === "move") {
    return `valid preview: move ${action.direction}; ${stateLabel}; ${firstEvidenceLine}`;
  }
  if (action.type === "place_tile") {
    return `valid preview: place_tile ${action.tile.trim()}; ${stateLabel}; ${firstEvidenceLine}`;
  }
  if (action.type === "leave_note") {
    return `valid preview: leave_note; ${stateLabel}; ${firstEvidenceLine}`;
  }
  if (action.type === "create_quest") {
    return `valid preview: create_quest; ${stateLabel}; ${firstEvidenceLine}`;
  }
  return `valid preview: ${action.type}; ${stateLabel}; ${firstEvidenceLine}`;
}

function handleLocalActionRunnerClick() {
  const parsed = parseActionSandboxInput(actionSandboxInput.value);
  const lines = [];
  let transcriptActionKind = "invalid JSON";
  let transcriptOutcome = "Action JSON parse error";

  if (!parsed.ok) {
    lines.push(...parsed.lines);
    transcriptOutcome = parsed.lines[0] ?? "Action JSON parse error";
  } else {
    transcriptActionKind = parsed.action.type ?? "unknown action";
    const validationErrors = validateSandboxAction(parsed.action);
    if (validationErrors.length > 0) {
      lines.push(...validationErrors);
      transcriptOutcome = validationErrors[0];
    } else if (currentPayload) {
      const currentSnapshot = currentPayload.snapshots[currentSnapshotIndex];
      lines.push(...buildLocalActionRunnerSummaryLines(parsed.action, currentSnapshot));
      transcriptOutcome = buildLocalSessionTranscriptOutcome(parsed.action, currentSnapshot, lines);
    } else {
      lines.push("Hypothetical one-action fork will appear after a replay loads.");
      transcriptOutcome = "valid preview unavailable until a replay loads";
    }
  }

  if (!lines.some((line) => line.startsWith("Preview only:"))) {
    lines.push("Preview only: no replay state is changed, saved, uploaded, or sent to a live multiplayer server.");
  }

  renderLocalActionRunner(lines);
  appendLocalSessionTranscriptEntry({ actionKind: transcriptActionKind, outcome: transcriptOutcome });
}

function renderActionSandbox() {
  const parsed = parseActionSandboxInput(actionSandboxInput.value);
  const lines = [];

  if (!parsed.ok) {
    lines.push(...parsed.lines);
  } else {
    const validationErrors = validateSandboxAction(parsed.action);
    if (validationErrors.length === 0 && currentPayload) {
      const currentSnapshot = currentPayload.snapshots[currentSnapshotIndex];
      lines.push(...buildActionSandboxPreviewLines(parsed.action, currentSnapshot));
    } else if (validationErrors.length === 0) {
      lines.push(`Action JSON is valid: ${parsed.action.type}`);
    } else {
      lines.push(...validationErrors);
    }
  }

  if (!lines.some((line) => line.startsWith("Preview only:"))) {
    lines.push("Preview only: no action was submitted, saved, uploaded, or sent to a live multiplayer server.");
  }
  const items = lines.map((line) => {
    const item = document.createElement("li");
    item.textContent = line;
    return item;
  });
  actionSandboxResult.replaceChildren(...items);
  actionSandboxStatus.textContent = "Preview only: this does not submit, save, upload, mutate state, or contact a live multiplayer server.";
}

function describeEvent(event) {
  if (event.type === "say") {
    return `${event.agent_id} said: ${event.message}`;
  }
  if (event.type === "place_tile") {
    return `${event.agent_id} placed ${event.tile} at ${formatPosition(event.position)}`;
  }
  if (event.type === "leave_note") {
    return `${event.agent_id} left a note: ${event.message}`;
  }
  if (event.type === "create_quest") {
    return `${event.agent_id} posted quest: ${event.title} — ${event.description}`;
  }
  if (event.type === "move") {
    return `${event.agent_id} moved from ${formatPosition(event.from)} to ${formatPosition(event.to)}`;
  }
  if (event.type === "gather") {
    return `${event.agent_id} gathered ${event.resource_id} for ${event.value}`;
  }
  if (event.type === "blocked") {
    return `${event.agent_id} was blocked moving ${event.direction}`;
  }
  if (event.type === "blocked_agent") {
    return `${event.agent_id} was blocked moving ${event.direction} by ${event.blocked_by}`;
  }
  if (event.type === "blocked_contested") {
    const contenders = event.contenders.join(", ");
    return `${event.agent_id} was blocked moving ${event.direction} into contested ${formatPosition(event.contested_destination)} with ${contenders}`;
  }
  if (event.type === "gather_empty") {
    return `${event.agent_id} tried to gather, but found nothing`;
  }
  if (event.type === "wait") {
    return `${event.agent_id} waited`;
  }
  return `${event.agent_id ?? "unknown agent"}: ${event.type}`;
}

function renderEventLog(events) {
  const eventLog = document.querySelector("#event-log");
  if (events.length === 0) {
    const item = document.createElement("li");
    item.textContent = "Initial room state before any replay events.";
    eventLog.replaceChildren(item);
    return;
  }

  const items = events.map((event) => {
    const item = document.createElement("li");
    item.textContent = describeEvent(event);
    return item;
  });
  eventLog.replaceChildren(...items);
}

function evidenceMatchesQuery(text, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery === "") {
    return true;
  }
  return text.toLowerCase().includes(normalizedQuery);
}

function renderFilteredEvidence(payload = currentPayload) {
  if (!payload) {
    return;
  }

  const query = evidenceFilter.value;
  const normalizedQuery = query.trim();
  const story = document.querySelector("#story");
  const eventLog = document.querySelector("#event-log");
  const turn = payload.replay.turns[currentSnapshotIndex - 1];
  const currentEvents = turn?.events ?? [];

  if (normalizedQuery === "") {
    story.textContent = payload.story_markdown;
    renderEventLog(currentEvents);
    evidenceFilterStatus.textContent = "Search story and event log text for the currently loaded replay.";
    return;
  }

  const matchingStoryLines = payload.story_markdown
    .split("\n")
    .filter((line) => evidenceMatchesQuery(line, normalizedQuery));
  const matchingEvents = currentEvents.filter((event) => evidenceMatchesQuery(describeEvent(event), normalizedQuery));
  const matchCount = matchingStoryLines.length + matchingEvents.length;

  if (matchCount === 0) {
    const noMatchText = `No story or event evidence matches "${normalizedQuery}".`;
    const item = document.createElement("li");
    item.textContent = noMatchText;
    story.textContent = noMatchText;
    eventLog.replaceChildren(item);
    evidenceFilterStatus.textContent = noMatchText;
    return;
  }

  story.textContent = matchingStoryLines.join("\n");
  if (matchingEvents.length === 0) {
    const item = document.createElement("li");
    item.textContent = `No current-turn events match "${normalizedQuery}".`;
    eventLog.replaceChildren(item);
  } else {
    renderEventLog(matchingEvents);
  }
  const matchLabel = matchCount === 1 ? "match" : "matches";
  evidenceFilterStatus.textContent = `Showing ${matchCount} story/event ${matchLabel} for "${normalizedQuery}".`;
}

function renderNotes(snapshot) {
  const notes = document.querySelector("#notes");
  const noteItems = snapshot.observation.notes;

  if (noteItems.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No room notes yet.";
    notes.replaceChildren(item);
    return;
  }

  const items = noteItems.map((note) => {
    const item = document.createElement("li");
    item.textContent = `${note.author_id} at ${formatPosition(note.position)}: ${note.message}`;
    return item;
  });
  notes.replaceChildren(...items);
}

function renderQuests(snapshot) {
  const quests = document.querySelector("#quests");
  const questItems = snapshot.observation.quests;

  if (questItems.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No quest cards yet.";
    quests.replaceChildren(item);
    return;
  }

  const items = questItems.map((quest) => {
    const item = document.createElement("li");
    item.textContent = `${quest.title} (${quest.status}) by ${quest.author_id}: ${quest.description}`;
    return item;
  });
  quests.replaceChildren(...items);
}

function renderTurn(payload, snapshotIndex) {
  currentPayload = payload;
  currentSnapshotIndex = snapshotIndex;
  const snapshot = payload.snapshots[snapshotIndex];
  const turn = payload.replay.turns[snapshotIndex - 1];
  renderGrid(snapshot);
  renderCellInspector(snapshot);
  renderParticipants(snapshot);
  renderPartyRoster(snapshot);
  renderStateSummary(snapshot);
  renderGroupPlayStats(payload, snapshotIndex);
  renderTurnActions(turn);
  renderActionPreview(snapshot);
  renderActionSandbox();
  renderActionResultPreview();
  renderActionRehearsal();
  renderNotes(snapshot);
  renderQuests(snapshot);
  renderFilteredEvidence(payload);

  for (const button of document.querySelectorAll(".turn-button")) {
    const isSelected = Number(button.dataset.snapshotIndex) === snapshotIndex;
    button.classList.toggle("turn-button--selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  }
}

function stopReplayAutoplay(message = "Autoplay is stopped.") {
  if (replayAutoplayTimer !== null) {
    clearInterval(replayAutoplayTimer);
    replayAutoplayTimer = null;
  }
  if (replayAutoplayToggle) {
    replayAutoplayToggle.textContent = "Play replay";
    replayAutoplayToggle.setAttribute("aria-pressed", "false");
  }
  if (replayAutoplayStatus) {
    replayAutoplayStatus.textContent = message;
  }
}

function advanceReplayAutoplay() {
  if (!currentPayload) {
    stopReplayAutoplay("Load a replay before autoplay.");
    return;
  }
  const nextSnapshotIndex = (currentSnapshotIndex + 1) % currentPayload.snapshots.length;
  renderTurn(currentPayload, nextSnapshotIndex);
  if (replayAutoplayStatus) {
    replayAutoplayStatus.textContent = `Autoplay showing turn ${currentPayload.snapshots[nextSnapshotIndex].turn}.`;
  }
}

function toggleReplayAutoplay() {
  if (replayAutoplayTimer !== null) {
    stopReplayAutoplay("Autoplay is stopped.");
    return;
  }
  if (!currentPayload) {
    stopReplayAutoplay("Load a replay before autoplay.");
    return;
  }
  replayAutoplayTimer = setInterval(advanceReplayAutoplay, 1200);
  if (replayAutoplayToggle) {
    replayAutoplayToggle.textContent = "Stop replay";
    replayAutoplayToggle.setAttribute("aria-pressed", "true");
  }
  if (replayAutoplayStatus) {
    replayAutoplayStatus.textContent = `Autoplay showing turn ${currentPayload.snapshots[currentSnapshotIndex].turn}.`;
  }
}

function renderTurnSelector(payload) {
  const turns = document.querySelector("#turns");
  const buttons = payload.snapshots.map((snapshot, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.classList.add("turn-button");
    button.dataset.snapshotIndex = String(index);
    button.setAttribute("aria-pressed", "false");
    button.textContent = `Turn ${snapshot.turn}`;
    button.addEventListener("click", () => {
      stopReplayAutoplay("Autoplay stopped after manual turn selection.");
      renderTurn(payload, index);
    });
    return button;
  });
  turns.replaceChildren(...buttons);
}

function renderPayload(payload, summaryText, selectedFixtureIdValue = null) {
  stopReplayAutoplay("Autoplay is stopped for the newly loaded replay.");
  selectedFixtureId = selectedFixtureIdValue;
  selectedCellKey = "0,0";
  currentPayload = payload;
  currentSnapshotIndex = payload.snapshots.length - 1;
  renderReplayValidation(payload);
  renderReplayMetadata(payload);
  renderTurnSelector(payload);
  renderTurn(payload, payload.snapshots.length - 1);
  document.querySelector("#fixture-summary").textContent = summaryText;

  for (const button of document.querySelectorAll(".fixture-button")) {
    const isSelected = selectedFixtureId !== null && button.dataset.fixtureId === selectedFixtureId;
    button.classList.toggle("fixture-button--selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  }
}

function validateViewerReplayPayload(payload) {
  if (!payload || payload.format !== "agent-playground.viewer-replay.v1") {
    throw new Error("Expected agent-playground.viewer-replay.v1 JSON");
  }
  if (!payload.replay || !Array.isArray(payload.replay.turns) || !Array.isArray(payload.snapshots)) {
    throw new Error("Viewer replay JSON is missing replay turns or snapshots");
  }
}

async function loadReplay(fixture) {
  const payload = await loadJson(fixture.path);
  currentFixture = fixture;
  currentLocalFileName = null;
  renderPayload(payload, `${fixture.title}: ${fixture.summary}`, fixture.id);
  renderFixtureDetails({ fixture, payload });
  renderReplayReviewChecklist(payload, { currentFixture: fixture });
  renderFixturePromotionStatus();
}

function loadFixtureById(fixtureId) {
  const fixture = loadedCatalog.find((candidate) => candidate.id === fixtureId);
  if (!fixture) {
    const summary = document.querySelector("#fixture-summary");
    summary.textContent = `No curated mode found for fixture ${fixtureId}.`;
    return;
  }
  loadReplay(fixture);
}

function setupGameModeCards() {
  for (const button of document.querySelectorAll("[data-mode-fixture-id]")) {
    button.addEventListener("click", () => {
      const fixtureId = button.dataset.modeFixtureId;
      loadFixtureById(fixtureId);
    });
  }
}

function setupLocalReplayLoader() {
  const input = document.querySelector("#local-replay-file");
  const status = document.querySelector("#local-replay-status");
  input.addEventListener("change", async () => {
    const selectedFile = input.files?.[0];
    if (!selectedFile) {
      status.textContent = "No local replay selected.";
      return;
    }
    try {
      const payload = JSON.parse(await selectedFile.text());
      validateViewerReplayPayload(payload);
      currentFixture = null;
      currentLocalFileName = selectedFile.name;
      renderPayload(payload, `Local replay file: ${selectedFile.name}`);
      renderFixtureDetails({ localFileName: selectedFile.name, payload });
      renderReplayReviewChecklist(payload, { localFileName: selectedFile.name, sourceLabel: "Local replay file" });
      renderFixturePromotionStatus();
      status.textContent = `Loaded local replay: ${selectedFile.name}`;
    } catch (error) {
      status.textContent = `Could not load local replay: ${error.message}`;
    }
  });
}

function fixtureMatchesQuery(fixture, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery === "") {
    return true;
  }

  const searchableText = [
    fixture.title,
    fixture.summary,
    fixture.path,
    fixture.participants.join(" "),
  ]
    .join(" ")
    .toLowerCase();
  return searchableText.includes(normalizedQuery);
}

function renderFixturePicker(fixtures) {
  const buttons = fixtures.map((fixture) => {
    const button = document.createElement("button");
    button.type = "button";
    button.classList.add("fixture-button");
    button.dataset.fixtureId = fixture.id;
    button.setAttribute("aria-pressed", "false");
    button.textContent = fixture.title;
    button.addEventListener("click", () => loadReplay(fixture));
    return button;
  });
  fixturePicker.replaceChildren(...buttons);
}

function renderFilteredFixturePicker() {
  const query = catalogFilter.value;
  const matchingFixtures = loadedCatalog.filter((fixture) => fixtureMatchesQuery(fixture, query));

  if (matchingFixtures.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.textContent = `No replay fixtures match "${query}".`;
    fixturePicker.replaceChildren(emptyMessage);
    catalogFilterStatus.textContent = `No replay fixtures match "${query}".`;
    return;
  }

  renderFixturePicker(matchingFixtures);
  const totalLabel = loadedCatalog.length === 1 ? "fixture" : "fixtures";
  const visibleLabel = matchingFixtures.length === 1 ? "fixture" : "fixtures";
  catalogFilterStatus.textContent =
    query.trim() === ""
      ? `Showing all ${loadedCatalog.length} replay ${totalLabel}.`
      : `Showing ${matchingFixtures.length} replay ${visibleLabel} matching "${query}".`;
}

async function main() {
  setupLocalReplayLoader();
  renderLocalSessionTranscript();
  renderLocalSessionSummary();
  renderLocalSessionReviewChecklist();
  renderLocalSessionEvidenceCitation();
  renderLocalSessionAttemptComparison();
  const catalog = await loadJson(catalogPath);
  loadedCatalog = catalog.fixtures;
  setupGameModeCards();
  renderFilteredFixturePicker();
  catalogFilter.addEventListener("input", () => renderFilteredFixturePicker());
  evidenceFilter.addEventListener("input", () => renderFilteredEvidence());
  if (localActionRunnerButton) {
    localActionRunnerButton.addEventListener("click", () => handleLocalActionRunnerClick());
  }
  if (localSessionTranscriptClearButton) {
    localSessionTranscriptClearButton.addEventListener("click", clearLocalSessionTranscript);
  }
  if (localSessionTranscriptFilterInput) {
    localSessionTranscriptFilterInput.addEventListener("input", () => renderLocalSessionTranscript());
  }
  if (localLiveRoomCreateButton) {
    localLiveRoomCreateButton.addEventListener("click", () => createLocalLiveSession());
  }
  if (localLiveRoomRefreshButton) {
    localLiveRoomRefreshButton.addEventListener("click", () => refreshLocalLiveRoom());
  }
  if (localLiveRoomSubmitButton) {
    localLiveRoomSubmitButton.addEventListener("click", () => submitLocalLiveActions());
  }
  if (localLiveRoomCleanupButton) {
    localLiveRoomCleanupButton.addEventListener("click", () => cleanupLocalLiveRoom());
  }
  if (replayAutoplayToggle) {
    replayAutoplayToggle.addEventListener("click", () => toggleReplayAutoplay());
    replayAutoplayToggle.setAttribute("aria-pressed", "false");
  }
  if (localLiveRoomJigglyActionInput) {
    localLiveRoomJigglyActionInput.addEventListener("input", () => validateLocalLiveActionInputStatus(localLiveRoomJigglyActionInput, "jiggly"));
    validateLocalLiveActionInputStatus(localLiveRoomJigglyActionInput, "jiggly");
  }
  if (localLiveRoomMoltieActionInput) {
    localLiveRoomMoltieActionInput.addEventListener("input", () => validateLocalLiveActionInputStatus(localLiveRoomMoltieActionInput, "moltie"));
    validateLocalLiveActionInputStatus(localLiveRoomMoltieActionInput, "moltie");
  }
  actionSandboxInput.addEventListener("input", () => {
    renderActionSandbox();
    renderActionResultPreview();
    renderActionRehearsal();
  });
  await loadReplay(catalog.fixtures[0]);
}

main().catch((error) => {
  document.querySelector("#story").textContent = `Viewer failed: ${error}`;
});
