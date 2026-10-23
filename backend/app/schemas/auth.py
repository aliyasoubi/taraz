from pydantic import BaseModel, Field


class LoginIn(BaseModel):
    password: str = Field(min_length=1, max_length=256)


class Me(BaseModel):
    authenticated: bool
