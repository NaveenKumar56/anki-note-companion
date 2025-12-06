# AnkiNote Companion

A smart note-taking sidebar for Anki that uses Google Gemini to refine your study notes.

## Part 1: Run the Web App (Required)

1.  **Install Node.js**
    Download the LTS version from [nodejs.org](https://nodejs.org/).

2.  **Install Dependencies**
    Open a terminal in this folder and run:
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

## Part 2: Install Anki Dock (Required)

The web app needs a "Container" to live inside Anki.

1.  Open Anki.
2.  Go to **Tools** -> **Add-ons** -> **View Files**.
3.  Create a **New Folder** named `AnkiNoteCompanion`.
4.  Inside that folder, create a text file named `__init__.py`.
5.  **Copy the code from the `anki_addon_code.py` file in this project.**
6.  **Paste it into the `__init__.py` file you just created.**
7.  Restart Anki.

## Part 3: Configure AnkiConnect

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

*   **App says "DISCONNECTED"**: Ensure Anki is open and AnkiConnect config is correct.
*   **Sidebar is blank**: Ensure you ran `npm run dev` and the terminal is still open.
*   **SyntaxError**: If you see errors about `{` or `import`, update your Node.js to version 18+.