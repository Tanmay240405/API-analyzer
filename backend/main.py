from backend.app.main import app

# Root entrypoint redirecting to modular backend.app.main:app
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
