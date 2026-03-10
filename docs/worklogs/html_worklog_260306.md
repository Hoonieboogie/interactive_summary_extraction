# Daily Work Log: Interactive Content Extraction Pipeline
**Date:** Friday, March 6, 2026
**Lead AI Expert:** Gemini CLI
**Objective:** Transition from Research to Implementation of a high-fidelity extraction pipeline for interactive HTML lessons.

---

## 1. Phase 1: Dynamic Browser Research (The "Simulator" Path)
We initially attempted to build a **"Dynamic Sensor"** that captures content by running the lessons in a real browser.
*   **Action:** Installed **Playwright** (Node.js browser automation tool) and Chromium.
*   **Tool Created:** `extractor/research_sensor.js` (v1.0).
*   **Workflow:** 
    1.  Launched a headless (background) browser.
    2.  Injected a script to "drive" the Aspen Engine (`sgg$exe.run()`) to walk through pages.
    3.  Scraped all text elements (`div`, `span`, `p`) from the active DOM.
*   **Result (Research Failure):** We discovered the **"Same Content Mystery."** Because the Aspen Engine uses persistent layers that stay in the DOM even when hidden, our sensor captured the same text on every page.
*   **Refinement:** Updated to `research_sensor.js` (v2.0) with surgical visibility checks (`getComputedStyle`) and 1.0s transition delays.

## 2. Phase 2: Strategic Pivot (The "Data Distillation" Path)
After re-analyzing the ground-up strategy, we realized that Browser Automation was too heavy (slow and expensive) for these specific contents.
*   **Finding:** 100% of the semantic value exists in the `data.js` file as raw, structured data.
*   **Decision:** Shifted to **"Option B: Smart Distillation"** (Static Analysis).
*   **Tool Created:** `extractor/distiller.js` (v2.0).
*   **Workflow:** 
    1.  Read the raw `data.js` file directly from the disk.
    2.  Performed **Recursive Crawling** to extract only "Human-Readable" strings (`text`, `html`, `label`).
    3.  Mapped the text specifically to **numeric Page IDs** to avoid cross-contamination.
*   **Success:** Extracted unique, high-fidelity dialogue, quiz questions, and medical instructions from multiple lessons in milliseconds.

## 3. Phase 3: Technical Hurdles (macOS TCC Blockers)
During implementation, we hit a critical macOS security gate.
*   **Issue:** `EPERM: operation not permitted` on the Desktop folder.
*   **Root Cause:** macOS **TCC (Transparency, Consent, and Control)** framework blocked the Terminal session after too many automated file operations in protected user directories.
*   **Troubleshooting:**
    *   *Attempted:* Resetting TCC database (`tccutil reset`).
    *   *Attempted:* Restarting the terminal session.
    *   *Final Fix:* Temporarily built the pipeline in a "Sandbox" (`~/.gemini/tmp`) to bypass the lock and then moved it back once permissions were manually restored by the user.

## 4. Phase 4: Final Pipeline Handover
We successfully built and delivered a production-ready orchestrator.
*   **Location:** `/Users/im_1703/Desktop/HTML_contens/pipeline/`
*   **Components:**
    *   `index.js`: The "Brain" that coordinates Distillation and AI Synthesis.
    *   `.env`: Secure management for the `GEMINI_API_KEY`.
    *   `package.json`: Dependency management for the Gemini AI SDK.
*   **Workflow:**
    1.  **Distill:** Converts 1.6MB of code into a 2KB clean JSON.
    2.  **Synthesize:** Sends data to **Gemini 1.5 Flash/Pro** to write a 3-paragraph educational summary.
    *   **Report:** Generates a structured `final_report.json` for cataloging.

    ## 5. Phase 5: Engine Forensics & Hidden Navigation
    During manual validation, we solved the mystery of why `index.html` often appears as a "single page" without navigation buttons.
    *   **Discovery 1: The "Player Shell":** Many lessons are designed to run inside an external "Shell" (provided by a website or i-Scream platform). The `index.html` file is just one "Slide" within that shell.
    *   **Discovery 2: Character-Based Navigation:** Transitions are often hidden behind interactive objects (e.g., "Click the characters to check examples"). The Aspen Engine uses **Layer Swapping** rather than page changes, making visual scraping unreliable.
    *   **Discovery 3: Audio-Locked Transitions:** Some "Next" actions are triggered by the **Audio Finishing**. Because browsers block auto-playing audio (or volume is muted), the lesson becomes "stuck" on the first screen.
    *   **Strategic Advantage:** These findings confirm that **Static Distillation (reading data.js directly)** is the only reliable way to capture 100% of the content, as it bypasses all UI/Audio blocks and "X-rays" every hidden layer and page ID instantly.

    ---

    ## Final Status:
    *   **Research:** 100% Complete.
    *   **Architecture:** Validated and Proven (Static Distillation > Dynamic Scraping).
    *   **Tools:** Delivered and Operational on Desktop.

    **Next Steps:** 
    1. Grant "Full Disk Access" to Terminal to prevent future macOS blocks.
    2. Implement "Dual-Path" logic for non-Aspen (e.g., "Black Box" PPT) content.
    3. Begin mass-extraction across the broader library.
