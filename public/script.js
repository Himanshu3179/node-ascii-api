document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("ascii-form");
    const imageUpload = document.getElementById("image-upload");
    const previewImg = document.getElementById("preview-img");
    const fileLabel = document.querySelector(".custom-file-upload");
    
    const widthSlider = document.getElementById("width");
    const contrastSlider = document.getElementById("contrast");
    const gammaSlider = document.getElementById("gamma");
    const brightnessSlider = document.getElementById("brightness");
    const invertCheck = document.getElementById("invert");
    
    const widthVal = document.getElementById("width-val");
    const contrastVal = document.getElementById("contrast-val");
    const gammaVal = document.getElementById("gamma-val");
    const brightnessVal = document.getElementById("brightness-val");

    const generateBtn = document.getElementById("generate-btn");
    const errorMsg = document.getElementById("error-message");
    const resultContainer = document.getElementById("result-container");
    const asciiOutput = document.getElementById("ascii-output");
    const downloadBtn = document.getElementById("download-btn");

    let selectedFile = null;

    // --- Event Listeners ---

    // Show image preview
    imageUpload.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedFile = file;
            fileLabel.textContent = file.name;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                previewImg.src = event.target.result;
                previewImg.style.display = "block";
            };
            reader.readAsDataURL(file);
        }
    });

    // Update slider value labels
    widthSlider.addEventListener("input", (e) => widthVal.textContent = e.target.value);
    contrastSlider.addEventListener("input", (e) => contrastVal.textContent = e.target.value);
    gammaSlider.addEventListener("input", (e) => gammaVal.textContent = e.target.value);
    brightnessSlider.addEventListener("input", (e) => brightnessVal.textContent = e.target.value);

    // Handle form submission
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            showError("Please select an image file first.");
            return;
        }

        setLoading(true);

        const formData = new FormData();
        formData.append("image", selectedFile);

        const params = new URLSearchParams({
            width: widthSlider.value,
            contrast: contrastSlider.value,
            gamma: gammaSlider.value,
            brightness: brightnessSlider.value,
            invert: invertCheck.checked,
        });

        const API_URL = `/ascii?${params.toString()}`;

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                body: formData,
            });

            const resultText = await response.text();

            if (!response.ok) {
                throw new Error(resultText || "Failed to generate ASCII art");
            }

            showResult(resultText);

        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    });

    // Handle download
    downloadBtn.addEventListener("click", () => {
        const art = asciiOutput.textContent;
        const blob = new Blob([art], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ascii-art.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // --- Helper Functions ---

    function setLoading(isLoading) {
        generateBtn.disabled = isLoading;
        generateBtn.textContent = isLoading ? "Generating..." : "Generate ASCII Art";
    }

    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.style.display = "block";
        resultContainer.style.display = "none";
    }

    function showResult(art) {
        errorMsg.style.display = "none";
        asciiOutput.textContent = art;
        resultContainer.style.display = "block";
    }
});