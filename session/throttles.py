import os

from rest_framework.throttling import UserRateThrottle


class RecommendationRateThrottle(UserRateThrottle):
    scope = "recommendations"

    def get_rate(self):
        return os.getenv("OPENAI_RECOMMENDATIONS_RATE_LIMIT", "5/hour")
