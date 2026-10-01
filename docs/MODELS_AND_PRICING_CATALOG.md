# AI Models & Pricing Catalog (DeepSeek & OpenAI)

This document serves as the authoritative reference for available models, API endpoints, feature support, context limits, and token pricing for both **DeepSeek** and **OpenAI**.

---

## 1. DeepSeek Models & Pricing Reference

### Endpoints
* **OpenAI-Compatible Format (Default)**: `https://api.deepseek.com`
* **Anthropic-Compatible Format**: `https://api.deepseek.com/anthropic`

### Model Specifications

| Specification | `deepseek-flash` | `deepseek-v4-pro` |
| :--- | :--- | :--- |
| **Model Name (API String)** | `deepseek-flash` *(legacy aliases `deepseek-v4-flash`, `deepseek-v4-flash-vision-exp` are accepted and served as Flash)* | `deepseek-v4-pro` |
| **Underlying Version** | DeepSeek-V4.1-Flash | DeepSeek-V4-Pro-0813 |
| **Thinking Mode** | Supports both non-thinking and thinking (default) modes | Supports both non-thinking and thinking (default) modes |
| **Context Length** | **1,000,000 tokens (1M)** | **1,000,000 tokens (1M)** |
| **Max Output Tokens** | **Up to 384,000 tokens (384K)** | **Up to 384,000 tokens (384K)** |
| **JSON Output** | Supported (`json_object` format) | Supported (`json_object` format) |
| **Tool Calls** | Supported | Supported |
| **Responses API** | Supported | Supported |
| **Anthropic API** | Supported | Supported |
| **Chat Prefix Completion (Beta)** | Supported | Supported |
| **FIM Completion (Beta)** | Supported (Non-thinking mode only) | Supported (Non-thinking mode only) |
| **Vision Support** | Supported | Not supported |
| **Concurrency Limit** | **2,500 concurrent requests** | **500 concurrent requests** |

### Pricing (Per 1 Million Tokens)

* **Peak Hours**: `01:00 - 04:00` and `06:00 - 10:00` UTC, Monday through Friday (excluding Chinese public holidays).
* **Off-Peak Hours**: All other hours, including full weekends and Chinese public holidays. Off-peak rates are **50% of peak rates**.

| Token Type | `deepseek-flash` (Off-Peak) | `deepseek-flash` (Peak) | `deepseek-v4-pro` (Off-Peak) | `deepseek-v4-pro` (Peak) |
| :--- | :--- | :--- | :--- | :--- |
| **1M Input (Cache Hit)** | **$0.003** | **$0.006** | **$0.022** | **$0.044** |
| **1M Input (Cache Miss)** | **$0.15** | **$0.30** | **$0.66** | **$1.32** |
| **1M Output Tokens** | **$0.60** | **$1.20** | **$1.98** | **$3.96** |

---

## 2. OpenAI Models Catalog

### Flagship Frontier Models
* **`gpt-6-astra`**: Most capable model for the most demanding multi-step work.
* **`gpt-6.1-sol`**: Near-Astra performance for complex agentic workflows at a lower cost.
* **`gpt-6-luna`**: Most efficient GPT-6 class model for focused, high-volume tasks.
* **`gpt-6-sol`**: Built specifically to power complex coding and agentic workflows.

### Production Coding & Professional Models (GPT-5.x Series)
* **`gpt-5.5`**: Default flagship intelligence for coding, architecture, and professional evaluation.
* **`gpt-5.5-pro`**: Specialized version that produces smarter and more mathematically precise responses.
* **`gpt-5.6-sol`**: High-capability flagship for complex professional workflows.
* **`gpt-5.6-terra`**: Balanced intelligence and cost.
* **`gpt-5.6-luna`**: Low-cost professional model.
* **`gpt-5.4`**: Affordable model for coding and generation tasks.
* **`gpt-5.4-pro`**: Precision edition of GPT-5.4.
* **`gpt-5.4-mini`**: **Strongest mini model** for coding, computer use, and fast subagent operations (Ideal for the interactive workspace assistant).
* **`gpt-5.4-nano`**: Cheapest GPT-5.4-class model for simple high-volume tasks.
* **`gpt-5.3-codex`**: High-capability agentic coding model.

### Deprecated / Succeeded Legacy Models (Reference Only)
* `gpt-4o` & `gpt-4o-mini`: Succeeded by `gpt-5.4-mini` / `gpt-5.5`.
* `o1`, `o1-mini`, `o1-pro`, `o3`, `o3-mini`: Succeeded by the GPT-5 and GPT-6 reasoning families.
* `gpt-4.5-preview`, `gpt-4-turbo`, `gpt-3.5-turbo`: Retired.

---

## 3. Platform Configuration & Stage Allocation

In ProofCraft (`ai-skill-evaluator-system`), models can be assigned globally or granularly per pipeline stage:

| Pipeline Stage | Stage Key | OpenAI Recommendation | DeepSeek Recommendation |
| :--- | :--- | :--- | :--- |
| **JD Parsing** | `*_MODEL_PARSE` | `gpt-5.4-mini` | `deepseek-flash` |
| **Market Research** | `*_MODEL_RESEARCH` | `gpt-5.4-mini` | `deepseek-flash` |
| **Challenge Generation** | `*_MODEL_CHALLENGE` | `gpt-5.5` or `gpt-6-sol` | `deepseek-flash` or `deepseek-v4-pro` |
| **Workspace Assistant (Chat)** | `*_MODEL_ASSISTANT` | `gpt-5.4-mini` *(Fastest SSE stream)* | `deepseek-flash` *(Fastest SSE stream)* |
| **Academic Evaluator** | `*_MODEL_EVALUATOR` | `gpt-5.5` or `gpt-5.5-pro` | `deepseek-v4-pro` *(Deep reasoning)* |

### Production Environment Variables Example

#### For DeepSeek:
```env
AI_PROVIDER="deepseek"
DEEPSEEK_API_KEY="sk-..."
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL="deepseek-flash"

# Optional stage overrides:
DEEPSEEK_MODEL_ASSISTANT="deepseek-flash"
DEEPSEEK_MODEL_EVALUATOR="deepseek-v4-pro"
```

#### For OpenAI:
```env
AI_PROVIDER="openai"
OPENAI_API_KEY="sk-proj-..."
OPENAI_MODEL="gpt-5.5"

# Optional stage overrides:
OPENAI_MODEL_ASSISTANT="gpt-5.4-mini"
OPENAI_MODEL_EVALUATOR="gpt-5.5"
```
