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
