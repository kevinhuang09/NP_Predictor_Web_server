document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('predictorForm');
    const loading = document.getElementById('loadingStatus');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fastaInput = document.getElementById('fastaInput').value.trim();
        const fileInput = document.getElementById('fileInput').files[0];
        const taskName = document.getElementById('jobTitle').value || "Untitled_Task";
        const email = document.getElementById('userEmail').value;

        // 1. 基本檢查：是否有輸入
        if (!fastaInput && !fileInput) {
            alert("Please provide a FASTA sequence or upload a file.");
            return;
        }

        // 2. 檔案大小檢查 (限制 5MB)
        const MAX_FILE_SIZE = 5 * 1024 * 1024; 
        if (fileInput && fileInput.size > MAX_FILE_SIZE) {
            alert("檔案太大了！請限制在 5MB 以內。");
            return;
        }

        loading.classList.remove('hidden');

        try {
            let finalSequence = fastaInput;

            // 3. 如果有上傳檔案，讀取檔案內容覆蓋 finalSequence
            if (fileInput) {
                finalSequence = await readFileContent(fileInput);
            }

            // 4. 發送請求到本地 API
            const response = await fetch('http://127.0.0.1:8000/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    task_name: taskName,
                    email: email, // 記得傳送 email
                    sequence: finalSequence
                })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const result = await response.json();

            // 5. 成功處理
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