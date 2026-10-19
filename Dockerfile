FROM python:3.12-slim
WORKDIR /app
COPY --chmod=644 main.py requirements.txt ./
ENV PYTHONUNBUFFERED=1
USER 65532:65532
CMD ["python", "main.py"]
