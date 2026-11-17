# Frontend Testing Documentation

This project uses [Vitest](https://vitest.dev/) as the test framework along with [Vue Test Utils](https://vue-test-utils.vuejs.org/) for testing Vue components.

## Getting Started

### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

Tests are organized in the `/tests` directory with a structure mirroring the `src` directory:

```
/tests
  /components      # Component tests
  /composables     # Composable tests
  /utils           # Test utilities
  setup.ts         # Global test setup
```

## Writing Tests

### Component Tests

Component tests should verify that the component:

- Renders correctly with different prop combinations
- Responds to user interactions as expected
- Emits the correct events when applicable
- Renders slot content correctly

Example:

```typescript
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import MyComponent from "@/components/MyComponent.vue";

describe("MyComponent.vue", () => {
  it("renders correctly with default props", () => {
    const wrapper = mount(MyComponent);
    expect(wrapper.exists()).toBe(true);
  });

  it("emits an event when button is clicked", async () => {
    const wrapper = mount(MyComponent);
    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("click")).toBeTruthy();
  });
});
```

### Composable Tests

Composable tests should verify that:

- The returned reactive properties update correctly based on inputs
- Methods behave as expected with different parameters
- Side effects occur as intended

Example:

```typescript
import { describe, it, expect } from "vitest";
import { useMyComposable } from "@/composables/useMyComposable";
import { ref } from "vue";

describe("useMyComposable", () => {
  it("returns expected values", () => {
    const input = ref("test");
    const { result } = useMyComposable(input);
    expect(result.value).toBe("TEST");

    // Test reactivity
    input.value = "changed";
    expect(result.value).toBe("CHANGED");
  });
});
```

## Mocking Dependencies

### Vue Router

```typescript
import { vi } from "vitest";

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));
```

### Axios/API Calls

```typescript
import { vi } from "vitest";

vi.mock("@/services/api", () => ({
  getItems: vi.fn().mockResolvedValue([{ id: 1, name: "Item 1" }]),
}));
```

## Best Practices

1. Test behavior, not implementation details
2. Keep tests independent from each other
3. Use descriptive test and assertion names
4. Mock external dependencies
5. Test edge cases and error scenarios
6. Use data-test attributes for element selection
7. Clean up after tests (handled automatically in setup.ts)


## Isolated local voice safety checks

These checks use the production IPC bridge, driver and voice button with a
simulated recognizer and decoder. They do not access a microphone, load/download
speech models, start Backend/Models or run the database reset setup.

```bash
./node_modules/.bin/vitest run tests/voice --maxWorkers=2
VOICE_SAFETY_OUTPUT=/absolute/private/path/local-voice-safety \
  ./node_modules/.bin/playwright test --config tests/voice/e2e/playwright.config.ts
```

Use an external directory for `VOICE_SAFETY_OUTPUT`. The standalone Playwright
configuration builds only the test harness and actual voice components, uses
Electron's sandbox, and keeps a separate profile for each test. Profiles and
artifacts are retained for inspection; the normal E2E global setup and its
`manage reset` are not used. The harness controls never ship in the application.


The local model preparation tests in `tests/voice/modelManager.spec.ts` use tiny
files and a simulated HTTPS transport. They cover fixed-manifest verification,
existing-file preservation, symlinks/hardlinks, private no-clobber publication,
redirect restrictions, bounded responses and timeout/failure cleanup. No actual
GGML weights are downloaded or passed to the native recognizer. Local engine
tests also verify that file verification gates each call and its delivered result.


Local evaluation capture is disabled for ordinary dictation. An operator must
launch Electron with `--evaluation-capture`; only the trusted main application
window's main frame may then request it. Each `startLocal` call must explicitly
supply `{ capture: { requestId, consent: 'granted', purpose: 'evaluation',
mediaType: 'audio/wav' } }` (the allowed Ogg/WebM formats are also accepted).
Use a fresh lowercase UUIDv4 for a new operation and numbered `pushChunkLocal`
inputs starting at 1. This is a laboratory IPC operation; the normal microphone
button and driver do not opt into it automatically.

Captures live in the Electron OS profile at `userData/evaluation/voice/<UUID>/`,
with private directories/files (0700/0600 on POSIX), no caller-supplied paths or
network destinations, and no automatic purge. They are local profile data,
not Backend execution records or an additional case bank. Active operations
retain their original window owner. After a restart, access requires the same
OS profile and the explicit main-process launch permission. It does not grant
access to another Backend user's data.

The journal records consent, ordered original audio, call input hashes,
parameters, PCM hash/shape, measured decoding/inference durations, bounded
results, main-process send events and terminal state. Audio is persisted and
synced before it is acknowledged or processed. Captured sessions retain at most
4 MiB of audio, 16 MiB of journal and 5000 events; a profile holds at most 64
records. Quota or write failures reject further work and preserve prior data.
Normal dictation retains its existing limits. The chained hashes detect damaged
or inconsistent evidence; they are not signatures against the OS profile owner.

`getCaptureLocal(requestId)` returns only a receipt. Supplying `true` explicitly
exports a validated snapshot with sensitive audio and text. It verifies the
journal chain, audio hashes/order and call/output bindings. A torn final append
exposes only its verified prefix as interrupted; unreadable or inconsistent
records fail closed. No read repairs files or restarts recognition. Repeating
`startLocal` with an existing identity and the same immutable grant returns
`claimed: false`; callers must inspect/collect that capture rather than send
audio again. Interrupted captures require a new UUID for a deliberately new run.

The capture distinguishes the expected GGML manifest and file readiness checks
from the missing loaded-model/native-binary identity and effective native
settings. The PCM hash is taken before native execution. `output.sent` means
that main invoked Electron's send method; renderer receipt and editor effects
remain unverified. No claim of complete inference reconstruction or quality is
made. The ai-train/MLflow collector is a subsequent block.

`captureStore.spec.ts` and `localCapture.spec.ts` cover opt-in authorization,
private files, bounds, corruption, interrupted appends, duplicate input,
read-only recovery, failure and cancellation without real models. The isolated
Electron suite also closes/relaunches its process to check stable recovery and
zero repeated engine initialization, and checks cancellation with a late
simulated result. Its retained profiles contain synthetic test data only.
