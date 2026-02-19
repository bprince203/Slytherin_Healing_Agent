from langchain_openai import ChatOpenAI


def get_llm(model: str = "gpt-4o-mini"):
    return ChatOpenAI(model=model, temperature=0)
