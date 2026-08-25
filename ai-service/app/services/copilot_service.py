import json
import urllib.error
import urllib.request

from app.schemas.copilot import CopilotContext


OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
OLLAMA_MODEL = "qwen2.5:7b"


def generate_copilot_response(
    message: str,
    context: CopilotContext,
) -> str:
    business_context = {
        "products": context.products,
        "transactions": context.transactions,
    }

    system_prompt = """
You are AI Daily Copilot, an AI business assistant for small businesses.

Your job is to help the business owner understand:
- sales performance
- products
- inventory
- revenue
- transaction patterns
- potential business problems

Use ONLY the business data provided in BUSINESS CONTEXT when making factual
claims about the user's business.

If the available data is insufficient, clearly say that the data is not
sufficient instead of inventing information.

Answer in Indonesian unless the user asks in another language.

Keep answers concise, practical, and easy for a business owner to understand.
"""

    user_prompt = f"""
BUSINESS CONTEXT:
{json.dumps(business_context, ensure_ascii=False, default=str)}

USER QUESTION:
{message}
"""

    payload = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "messages": [
            {
                "role": "system",
                "content": system_prompt.strip(),
            },
            {
                "role": "user",
                "content": user_prompt.strip(),
            },
        ],
    }

    request = urllib.request.Request(
        OLLAMA_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=120,
        ) as response:
            result = json.loads(
                response.read().decode("utf-8"),
            )

    except urllib.error.URLError as error:
        raise RuntimeError(
            "Tidak dapat terhubung ke Ollama. "
            "Pastikan Ollama sedang berjalan."
        ) from error

    assistant_message = (
        result.get("message", {}).get("content")
    )

    if not assistant_message:
        raise RuntimeError(
            "Ollama tidak memberikan response yang valid."
        )

    return assistant_message.strip()