import fs from "fs";
import { openai } from "../../src/openai.js";
import {
  helperName,
  helperPath,
  helperThread,
  helperThreadID,
  helperFindAssistant,
} from "../helpers.js";
import {
  TestAssistant,
  EchoAssistant,
  EchoAssistantWithSetNameAndIdOption,
  OddFactsAssistant,
  RouterAssistant,
} from "../fixtures.js";

beforeEach(() => {
  delete process.env.TEST_ECHO_TOOL_ID;
});

test("assistant as tool", async () => {
  const assistant = await RouterAssistant.create();
  const threadID = await helperThreadID();
  const output = await assistant.ask("i need sales help", threadID);
  expect(output).toMatch(/unrouteable/);
  const output2 = await assistant.ask("/echo 123 hello", threadID);
  expect(output2).toMatch(/123 hello/);
  // Ensure each has own tread using metadata links.
  const thread = await helperThread(threadID);
  expect(thread.metadata.echo).toMatch(/thread_/);
  const thread2 = await helperThread(thread.metadata.echo);
  expect(thread2.metadata.tool).toMatch(/Experts\.js \(EchoTool\)/);
});

describe("with vector store", () => {
  test("can provide tools", async () => {
    const assistant = await OddFactsAssistant.create();
    const threadID = await helperThreadID();
    const output = await assistant.ask(
      "Using a single word response, tell me what food source do Proxima Centauri b inhabitants migrate for?",
      threadID
    );
    expect(output).toMatch(/Snorgronk/);
  });
});

test("can ask the assistant a question using a thread id", async () => {
  const assistant = await EchoAssistant.create();
  const threadID = await helperThreadID();
  const output = await assistant.ask("hello 123", threadID);
  expect(output).toBe("hello 123");
});

test("can use environment variables to find an assistant by id", async () => {
  const assistant = await EchoAssistantWithSetNameAndIdOption.create();
  // Will find the same assistant by name.
  const assistant2 = await EchoAssistantWithSetNameAndIdOption.create();
  expect(assistant.id).toBe(assistant2.id);
  // Will find by id.
  process.env.TEST_ECHO_TOOL_ID = assistant2.id;
  const assistant3 = await EchoAssistantWithSetNameAndIdOption.create();
  expect(assistant2.id).toBe(assistant3.id);
});

test("can configure various options", async () => {
  const path = helperPath("test/fixtures/data.csv");
  const file = await openai.files.create({
    file: fs.createReadStream(path),
    purpose: "assistants",
  });
  const assistant = await TestAssistant.createWithOptions({
    metadata: { foo: "bar" },
    temperature: 0.5,
    top_p: 0.5,
    tool_resources: {
      code_interpreter: { file_ids: [file.id] },
    },
    response_format: { type: "json_object" },
  });
  expect(assistant.metadata).toStrictEqual({ foo: "bar" });
  expect(assistant.temperature).toBe(0.5);
  expect(assistant.top_p).toBe(0.5);
  expect(assistant.assistant.tool_resources).toStrictEqual({
    code_interpreter: { file_ids: [file.id] },
  });
  expect(assistant.assistant.response_format).toStrictEqual({
    type: "json_object",
  });
});

test.only("create new assistant using name, description, and instruction defaults", async () => {
  // None exists before creation.
  const name = helperName("Test");
  TestAssistant.name = name;
  const assistantNone = await helperFindAssistant(name);
  expect(assistantNone).toBeUndefined();
  const assistant = await TestAssistant.create();
  const backendAssistant = await helperFindAssistant(name);
  // Assistant
  expect(assistant.agentName).toBe(name);
  expect(assistant.description).toBe("test-description");
  expect(assistant.instructions).toBe("test-instructions");
  expect(assistant.llm).toBe(true);
  expect(assistant.model).toBe("gpt-4-turbo");
  expect(assistant.temperature).toBe(1.0);
  expect(assistant.metadata).toStrictEqual({});
  expect(assistant.id).toMatch(/^asst_/);
  expect(assistant.id).toBe(backendAssistant.id);
  // Backend
  expect(backendAssistant).toBeDefined();
  expect(backendAssistant.name).toBe(name);
  expect(backendAssistant.description).toBe("test-description");
  expect(backendAssistant.instructions).toBe("test-instructions");
  expect(backendAssistant.model).toBe("gpt-4-turbo");
  expect(backendAssistant.temperature).toBe(1.0);
  expect(backendAssistant.metadata).toStrictEqual({});
  expect(backendAssistant.id).toMatch(/^asst_/);
});
