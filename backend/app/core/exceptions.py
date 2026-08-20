"""Domain exceptions with a consistent HTTP error envelope.

Every error response produced by the app has the shape::

    {"detail": "<human readable message>", "error_code": "<stable code>"}
"""


class AppError(Exception):
    status_code: int = 400
    error_code: str = "app_error"

    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


class NotFoundError(AppError):
    status_code = 404
    error_code = "not_found"


class AuthenticationError(AppError):
    status_code = 401
    error_code = "authentication_failed"


class AuthorizationError(AppError):
    status_code = 403
    error_code = "forbidden"


class ConflictError(AppError):
    status_code = 409
    error_code = "conflict"


class NotImplementedAppError(AppError):
    """Raised by endpoint stubs whose feature is planned for a later stage."""

    status_code = 501
    error_code = "not_implemented"
