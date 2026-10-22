# Qwen Sayfa Özetleyici

Açık olan web sayfasını tek tıkla **Türkçe özetleyen** bir Chrome eklentisi. Özet, bilgisayarınızda çalışan bir yapay zekâ modeliyle (Ollama + `qwen3:1.7b`) oluşturulur. Metin hiçbir bulut servisine gönderilmez, internet bağlantısı veya API anahtarı gerekmez.

## Nasıl çalışır?

```
Chrome eklentisi ──(sayfa metni)──▶ FastAPI sunucusu ──▶ Qwen-Agent ──▶ Ollama (qwen3:1.7b)
       ▲                                   │
       └──────(özet, parça parça)──────────┘
```

1. Eklenti, aktif sekmedeki görünür metni alır.
2. Metni yerel sunucuya (`127.0.0.1:7864`) gönderir.
3. Sunucu, Qwen-Agent üzerinden modelden özet ister.
4. Özet üretildikçe açılır pencerede kelime kelime görünür.

## Kullanılan teknolojiler ve teknikler

| Alan | Teknoloji / teknik |
|---|---|
| Model | **Qwen3 1.7B**, **Ollama** ile yerel olarak, OpenAI uyumlu `/v1` API üzerinden |
| Ajan katmanı | **Qwen-Agent** (`Assistant`) |
| Backend | **Python**, **FastAPI**, **Uvicorn** |
| Akış (streaming) | NDJSON olay akışı (`status` / `delta` / `done` / `error`). Qwen-Agent'ın kümülatif yanıtları, tekrarsız parçalara çevrilir. |
| Düşünme modu | `reasoning_effort: "none"` ile kapalı; yine de üretilen `<think>` bloğu kullanıcıya gösterilmez. |
| Eklenti | **Chrome Manifest V3**, saf HTML/CSS/JavaScript. `chrome.scripting` ile metin alınır, `fetch` + `ReadableStream` ile akış okunur. |
| Güvenlik | Prompt injection'a karşı sayfa metni modele "talimat değil, veri" olarak etiketlenir. Çıktı `textContent` ile düz metin gösterilir (XSS yok). Sunucu yalnızca `127.0.0.1`'i dinler ve başka sitelerden gelen istekleri reddeder. Eklenti en az izinle çalışır (`activeTab`, `scripting`). |
| Test | **pytest** ve FastAPI `TestClient` (istek doğrulama, akış birleştirme, hata durumları) |

## Kurulum (Windows PowerShell)

**1. Ollama ve model:** [ollama.com/download](https://ollama.com/download) adresinden Ollama'yı kurun, sonra modeli indirin:

```powershell
ollama pull qwen3:1.7b
```

**2. Python ortamı** (Python 3.10+):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**3. Sunucuyu başlatın:**

```powershell
python backend\app.py
```

Kontrol için `Invoke-RestMethod http://127.0.0.1:7864/health` çalıştırın; yanıtta `ollama : ok` görmelisiniz.

**4. Eklentiyi yükleyin:** `chrome://extensions` adresinde **Geliştirici modu**nu açın, **Paketlenmemiş öğe yükle**'ye tıklayın ve `extension` klasörünü seçin.

## Kullanım

Bir haber veya blog sayfası açın, eklenti simgesine tıklayın ve **Özetle**'ye basın.

- Uzun sayfalarda ilk 6.000 karakter özetlenir ve bu kullanıcıya bildirilir.
- Sunucu kapalıysa, model eksikse veya sayfa okunamıyorsa (ör. `chrome://` sayfaları) anlaşılır bir hata mesajı gösterilir.

## Ayarlar

Ayarlar `backend/config.py` dosyasındadır ve ortam değişkenleriyle değiştirilebilir:

| Değişken | Varsayılan |
|---|---|
| `MODEL_NAME` | `qwen3:1.7b` |
| `OLLAMA_BASE_URL` | `http://localhost:11434/v1` |
| `PORT` | `7864` |
| `MAX_INPUT_CHARS` | `6000` |
| `SUMMARY_LANGUAGE` | `Türkçe` |

`PORT`'u değiştirirseniz `extension/manifest.json` ve `extension/popup.js` içindeki adresi de güncelleyin.

## Proje yapısı

```
backend/
  app.py         FastAPI sunucusu, Qwen-Agent entegrasyonu, akış
  config.py      Ayarlar
  test_app.py    Testler
extension/
  manifest.json  Eklenti tanımı (MV3)
  popup.html/js/css  Arayüz
```

## API

`POST /summarize_stream_status` uç noktası `{"content": "..."}` gövdesi alır ve `application/x-ndjson` akışı döndürür.

- Boş metin: `400`
- Hatalı veya eksik alan: `422`
- Ollama'ya ulaşılamıyor ya da model yok: `503`

## Testler

```powershell
python -m pytest backend -q
```
