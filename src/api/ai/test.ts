import { findTargetPersonByAI } from ".";


const res = {
  "id": "019b5fc2ed939d557ccd9b5e782dd242",
  "object": "chat.completion",
  "created": 1766838169,
  "model": "deepseek-ai/DeepSeek-V3.2",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "0"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 349,
    "completion_tokens": 1,
    "total_tokens": 350,
    "completion_tokens_details": {
      "reasoning_tokens": 0
    }
  },
  "system_fingerprint": ""
}

findTargetPersonByAI()


