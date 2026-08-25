from fastapi import APIRouter, HTTPException

from app.schemas.copilot import (
    CopilotRequest,
    CopilotResponse,
)
from app.services.copilot_service import (
    generate_copilot_response,
)


router = APIRouter(
    prefix="/api/copilot",
    tags=["copilot"],
)


@router.post(
    "",
    response_model=CopilotResponse,
)
def ask_copilot(
    request: CopilotRequest,
) -> CopilotResponse:
    try:
        message = generate_copilot_response(
            message=request.message,
            context=request.context,
        )

        return CopilotResponse(
            message=message,
        )

    except RuntimeError as error:
        raise HTTPException(
            status_code=503,
            detail=str(error),
        ) from error

    except Exception as error:
        print(
            "Unexpected Copilot error:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail="AI Copilot gagal memproses pertanyaan.",
        ) from error