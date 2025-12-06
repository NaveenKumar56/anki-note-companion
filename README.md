# AnkiNote Companion

A smart note-taking sidebar for Anki that uses Google Gemini to refine your study notes.

## Manual Installation (Windows)

1.  **Install Node.js**
    Download the LTS version from [nodejs.org](https://nodejs.org/).

2.  **Install Dependencies**
    Open a terminal (Command Prompt or PowerShell) in this folder and run:
    ```bash
    npm install
    ```

3.  **Setup API Key**
    Create a file named `.env` in this folder. Add your Google Gemini API key:
    ```env
    API_KEY=AIzaSy...YourKey...
    ```

4.  **Run the App**
    Start the development server:
    ```bash
    npm run dev
    ```

## Anki Configuration

1.  Install the **AnkiConnect** add-on (Code: `2055492159`).
2.  Go to **Tools** -> **Add-ons** -> **AnkiConnect** -> **Config**.
3.  Update `webCorsOriginList` to include your local server:
    ```json
    {
      "webCorsOriginList": [
        "http://localhost:3000",
        "http://127.0.0.1:3000"
      ]
    }
    ```
4.  Restart Anki.

## Troubleshooting

*   **"npm is not recognized"**: Restart your computer after installing Node.js.
*   **App says "DISCONNECTED"**: Ensure Anki is open and the AnkiConnect config matches the port (default 8765) and CORS settings.
