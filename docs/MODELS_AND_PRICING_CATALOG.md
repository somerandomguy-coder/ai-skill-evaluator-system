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

### Flagship Models (Prices per 1M Tokens)

| Model | Short Context: Input | Short Context: Cached Input | Short Context: Cache Writes | Short Context: Output | Long Context: Input | Long Context: Cached Input | Long Context: Cache Writes | Long Context: Output |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`gpt-6-astra`** | $10.00 | $1.00 | $12.50 | $50.00 | $20.00 | $2.00 | $25.00 | $75.00 |
| **`gpt-6.1-sol`** | $2.00 | $0.10 | $2.50 | $10.00 | $4.00 | $0.20 | $5.00 | $15.00 |
| **`gpt-6-luna`** | $0.10 | $0.01 | $0.125 | $0.50 | $0.20 | $0.02 | $0.25 | $0.75 |
| **`gpt-6-sol`** | $2.00 | $0.20 | $2.50 | $10.00 | $4.00 | $0.40 | $5.00 | $15.00 |
| **`gpt-5.6-sol`** | $4.00 | $0.40 | $5.00 | $20.00 | $8.00 | $0.80 | $10.00 | $30.00 |
| **`gpt-5.6-terra`** | $2.00 | $0.20 | $2.50 | $12.00 | $4.00 | $0.40 | $5.00 | $18.00 |
| **`gpt-5.6-luna`** | $0.20 | $0.02 | $0.25 | $1.20 | $0.40 | $0.04 | $0.50 | $1.80 |
| **`gpt-5.5`** | $5.00 | $0.50 | - | $30.00 | $10.00 | $1.00 | - | $45.00 |
| **`gpt-5.5-pro`** | $30.00 | - | - | $180.00 | $60.00 | - | - | $270.00 |
| **`gpt-5.4`** | $2.50 | $0.25 | - | $15.00 | $5.00 | $0.50 | - | $22.50 |
| **`gpt-5.4-pro`** | $30.00 | - | - | $180.00 | $60.00 | - | - | $270.00 |

### Compact, Standard & Reasoning Models (Prices per 1M Tokens)

| Model | Input | Cached Input | Output | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **`gpt-5.4-mini`** | **$0.75** | **$0.075** | **$4.50** | **Strongest mini model** for coding, subagents & workspace assistant |
| **`gpt-5.4-nano`** | $0.20 | $0.02 | $1.25 | Ultra low-cost for simple high-volume tasks |
| **`gpt-5.2`** | $1.75 | $0.175 | $14.00 | Previous flagship model with configurable reasoning effort |
| **`gpt-5.2-pro`** | $21.00 | - | $168.00 | Precision edition of GPT-5.2 |
| **`gpt-5.1`** | $1.25 | $0.125 | $10.00 | Coding and agentic model with reasoning effort |
| **`gpt-5`** | $1.25 | $0.125 | $10.00 | Previous intelligent reasoning model |
| **`gpt-5-mini`** | $0.25 | $0.025 | $2.00 | Low-latency high-volume model |
| **`gpt-5-nano`** | $0.05 | $0.005 | $0.40 | Fastest, most cost-efficient GPT-5 tier |
| **`gpt-5-pro`** | $15.00 | - | $120.00 | Precision edition of GPT-5 |
| **`gpt-4.1`** | $2.00 | $0.50 | $8.00 | Smartest non-reasoning model |
| **`gpt-4.1-mini`** | $0.40 | $0.10 | $1.60 | Smaller, faster version of GPT-4.1 |
| **`gpt-4.1-nano`** | $0.10 | $0.025 | $0.40 | Deprecated nano tier |
| **`gpt-4o`** | $2.50 | $1.25 | $10.00 | Fast, intelligent multimodal GPT model |
| **`gpt-4o-mini`** | $0.15 | $0.075 | $0.60 | Lightweight mini model |
| **`o4-mini`** | $1.10 | $0.275 | $4.40 | Fast reasoning model, succeeded by GPT-5 Mini |
| **`o3`** | $2.00 | $0.50 | $8.00 | Reasoning model for complex tasks, succeeded by GPT-5 |
| **`o3-mini`** | $1.10 | $0.55 | $4.40 | Small model alternative to o3 |
| **`o3-pro`** | $20.00 | - | $80.00 | Deep compute reasoning edition |
| **`o1`** | $15.00 | $7.50 | $60.00 | Previous full o-series reasoning model |
| **`o1-pro`** | $150.00 | - | $600.00 | Frontier o1 compute edition |

### Legacy Pricing Reference
* `gpt-4o-2024-05-13`: $5.00 Input / $15.00 Output
* `gpt-4-turbo-2024-04-09`: $10.00 Input / $30.00 Output
* `gpt-4-0613`: $30.00 Input / $60.00 Output
* `gpt-3.5-turbo` / `gpt-3.5-turbo-0125`: $0.50 Input / $1.50 Output
* `gpt-3.5-turbo-1106`: $1.00 Input / $2.00 Output
* `gpt-3.5-turbo-instruct`: $1.50 Input / $2.00 Output
* `davinci-002`: $2.00 Input / $2.00 Output
* `babbage-002`: $0.40 Input / $0.40 Output

### Policy & Billing Notes
* **Regional Data Residency**: Regional processing endpoints carry a **10% uplift** for models released on or after March 5, 2026.
* **FedRAMP Endpoints**: Also charged a **10% uplift**.
* **Processing Speed Tier**: "Priority processing" was renamed to **Fast mode** on July 30, 2026.
* **Promotional Pricing**: GPT-5.6 Sol promotional pricing is available at least through November 21, 2026.

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
