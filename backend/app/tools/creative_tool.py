import os

from app.models import StrategyOutput, BrandKit
from app.services import creative_service
from app.db import creative_store
from app.tools.base import Tool


def _run(business_id: str, strategy: dict = None, brand: dict = None, **_kwargs) -> dict:
    if not strategy:
        raise ValueError("strategy is required — call strategy_tool first.")
    strategy_obj = StrategyOutput(**strategy)
    brand_obj = BrandKit(**(brand or {"business_name": business_id}))
    creative = creative_service.generate_creative(strategy_obj, brand_obj)

    # Persist to the dashboard's own creatives table (source='generated') so
    # it actually shows up in the Creative Library, instead of only ever
    # existing in this turn's scratchpad.
    creative_id = creative_store.save_generated_creative(
        business_id,
        name=f"{strategy_obj.business_type} — {creative.headline}"[:120],
        image_filename=os.path.basename(creative.image_path),
    )

    result = creative.model_dump()
    result["creative_id"] = creative_id
    return {"creative": result}


TOOL = Tool(
    name="creative_tool",
    description=(
        "Generates ad creative for a strategy + brand: an on-brand image, headline, primary "
        "text, and CTA. Requires the strategy object produced by strategy_tool."
    ),
    args_schema={
        "strategy": "the strategy object returned by strategy_tool (object)",
        "brand": "optional brand kit: business_name, logo_path, primary_color, secondary_color (object)",
    },
    handler=_run,
)
