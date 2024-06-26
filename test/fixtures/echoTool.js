import { helperName } from "../helpers.js";
import { Tool } from "../../src/experts/tool.js";

class EchoTool extends Tool {
  constructor() {
    const name = helperName("EchoTool");
    const description = "Echo";
    const instructions = "Echo the same text back to the user";
    super(name, description, instructions, {
      parentsTools: [
        {
          type: "function",
          function: {
            name: EchoTool.toolName,
            description: description,
            parameters: {
              type: "object",
              properties: { message: { type: "string" } },
              required: ["message"],
            },
          },
        },
      ],
    });
  }
}

export { EchoTool };
