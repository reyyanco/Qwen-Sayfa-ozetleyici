"""Ayarlar. Her değer aynı adlı ortam değişkeniyle değiştirilebilir."""
import os

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
MODEL_NAME = os.getenv("MODEL_NAME", "qwen3:1.7b")

HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "7864"))

# Modele gönderilecek en fazla karakter; daha uzun metin kısaltılır ve kullanıcıya bildirilir.
# Ollama'nın varsayılan bağlam penceresine (4096 token) sığacak şekilde seçildi; Ollama'yı
# OLLAMA_CONTEXT_LENGTH=8192 ile başlatırsanız bunu ~12000'e çıkarabilirsiniz.
MAX_INPUT_CHARS = int(os.getenv("MAX_INPUT_CHARS", "6000"))
# Bu sınırın üstündeki istekler reddedilir (eklenti zaten bu kadarını gönderir).
MAX_REQUEST_CHARS = int(os.getenv("MAX_REQUEST_CHARS", "200000"))

SUMMARY_LANGUAGE = os.getenv("SUMMARY_LANGUAGE", "Türkçe")
