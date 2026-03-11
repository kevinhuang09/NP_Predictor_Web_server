document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('predictorForm');
    const loading = document.getElementById('loadingStatus');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fastaInput = document.getElementById('fastaInput').value.trim();
        const fileInput = document.getElementById('fileInput').files[0];
        const taskName = document.getElementById('jobTitle').value || "Untitled_Task";
        const email = document.getElementById('userEmail').value;

        // 1. 基本檢查
        if (!fastaInput && !fileInput) {
            alert("Please provide a FASTA sequence or upload a file.");
            return;
        }

        loading.classList.remove('hidden');

        try {
            let finalSequence = fastaInput;

            // 2. 如果有上傳檔案，先讀取檔案內容
            if (fileInput) {
                finalSequence = await readFileContent(fileInput);
            }

            // 3. 發送請求到本地 API (假設 API 運行在 8000 埠)
            const response = await fetch('http://127.0.0.1:8000/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    task_name: taskName,
                    email: email,
                    sequence: finalSequence
                })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const result = await response.json();

            // 4. 成功處理
            console.log("Prediction Result:", result);
            alert(`Submission Successful!\nTask: ${result.task}\nResult: ${result.data.label} (Score: ${result.data.score})`);

        } catch (error) {
            console.error("Connection Error:", error);
            alert("Failed to connect to the Local Prediction Server. Please ensure the Python API is running.");
        } finally {
            loading.classList.add('hidden');
        }
    });

    // 輔助函式：讀取本地檔案內容
    function readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }
});