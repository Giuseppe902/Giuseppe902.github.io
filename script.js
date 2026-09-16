// 1. MAPPATURA ORIENTATA AGLI ARTEFATTI (Rispetta le maiuscole/minuscole esatte del filesystem)
const mappaturaDocumentaleDVR = {
    "1": "Ufficio Ammini.pdf",
    "2": "Ufficio Tecnico.pdf",
    "3": "riunioni.pdf",
    "4": "fotocopie.pdf",
    "5": "W.C..pdf",
    "6": "attesa.pdf",
    "7": "ingresso.pdf",
    "8": "Corridoio.pdf",
    "9": "archivi.pdf",
    "10": "segreteria.pdf",
    "11": "officina.pdf",
    "12": "Deposito Attrezzature.pdf",
    "13": "deposito materiali.pdf",
    "14": "deposito principale.pdf",
    "15": "zona esterna.pdf"
};

// Configurazione del percorso relativo per il routing cross-platform dei file PDF
const prefissoCartellaPDF = "PDF/";

// L'intero blocco funzionale viene attivato quando il DOM è completamente istanziato
document.addEventListener("DOMContentLoaded", () => {
    
    //------------------------------------------------------------------
    // A. GESTIONE ROUTING DA MENU A TENDINA (INPUT MANUALE)
    //------------------------------------------------------------------
    const riskForm = document.getElementById("risk-form");
    if (riskForm) {
        riskForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const idSelezionato = document.getElementById("posizione-select").value;
            if (idSelezionato) {
                reindirizzaADocumentoPDF(idSelezionato);
            }
        });
    }

    //------------------------------------------------------------------
    // B. GESTIONE SCANNER OTTICO (ACCESSO HARDWARE ALLA FOTOCAMERA)
    //------------------------------------------------------------------
    const lettoreQRNode = document.getElementById("reader");
    let istanzaHtml5QrCode = null;

    // Inizializza l'oggetto della libreria solo se il nodo d'ancoraggio è presente nel DOM
    if (lettoreQRNode) {
        istanzaHtml5QrCode = new Html5Qrcode("reader");
    }

    const btnStartCamera = document.getElementById("btn-start-camera");
    const btnStopCamera = document.getElementById("btn-stop-camera");
    const cameraContainer = document.getElementById("camera-preview-container");

    // Funzione di callback attivata all'atto del rilevamento ottico di un QR Code valido
    function onScanSuccess(decodedText) {
        let stringaIdentificativa = decodedText.trim();
        
        // Estrae l'ID numerico nel caso in cui il QR Code contenga un URL completo (?areaId=X)
        if (stringaIdentificativa.includes("areaId=")) {
            const parametriURL = new URLSearchParams(stringaIdentificativa.split('?')[1]);
            stringaIdentificativa = parametriURL.get("areaId");
        }

        // Se l'ID appartiene alla mappatura aziendale, disattiva la camera e apre il PDF
        if (mappaturaDocumentaleDVR[stringaIdentificativa]) {
            disattivaFlussoVideoHardware();
            reindirizzaADocumentoPDF(stringaIdentificativa);
        } else {
            alert(`QR Code scansionato: "${stringaIdentificativa}". Valore non associato alle 15 aree del DVR.`);
        }
    }

    // Event Listener per l'attivazione della fotocamera (Richiede permessi espliciti)
    if (btnStartCamera) {
        btnStartCamera.addEventListener("click", () => {
            cameraContainer.style.display = "block";
            btnStartCamera.style.display = "none";
            btnStopCamera.style.display = "block";

            // Richiede l'attivazione della fotocamera posteriore (environment) per la scansione sul posto
            istanzaHtml5QrCode.start(
                { facingMode: "environment" }, 
                {
                    fps: 15,                  // Frequenza di campionamento dei fotogrammi al secondo
                    qrbox: { width: 250, height: 250 } // Dimensione della finestra di scansione quadrata
                },
                onScanSuccess,
                () => {
                    // Ignorato per evitare sovraccarico computazionale nei log interni del browser
                }
            ).catch(err => {
                // Gestione degli errori legati ai vincoli di sicurezza (mancanza di HTTPS o rifiuto dei permessi)
                alert("Errore di accesso alla fotocamera. Assicurati che il sito utilizzi un protocollo sicuro HTTPS o localhost, e di aver concesso l'autorizzazione all'uso del dispositivo.");
                disattivaFlussoVideoHardware();
                console.error("Dettaglio eccezione hardware fotocamera:", err);
            });
        });
    }

    // Event Listener per la disattivazione manuale dello streaming video
    if (btnStopCamera) {
        btnStopCamera.addEventListener("click", () => {
            disattivaFlussoVideoHardware();
        });
    }

    // Funzione interna per il rilascio controllato delle risorse hardware della telecamera
    function disattivaFlussoVideoHardware() {
        if (istanzaHtml5QrCode && istanzaHtml5QrCode.isScanning) {
            istanzaHtml5QrCode.stop().then(() => {
                cameraContainer.style.display = "none";
                btnStartCamera.style.display = "block";
                btnStopCamera.style.display = "none";
            }).catch(err => console.error("Errore durante il rilascio della risorsa video:", err));
        } else {
            cameraContainer.style.display = "none";
            btnStartCamera.style.display = "block";
            if (btnStopCamera) btnStopCamera.style.display = "none";
        }
    }

    //------------------------------------------------------------------
    // C. GESTIONE UPLOAD FILE IMMAGINE QR CODE (FALLBACK PER DISPOSITIVI MOBILI)
    //------------------------------------------------------------------
    const fileInput = document.getElementById("qr-file-input");
    if (fileInput) {
        fileInput.addEventListener("change", (e) => {
            if (e.target.files.length === 0) return;
            const fileImmagineSelezionato = e.target.files[0];
            
            // Se la fotocamera è in esecuzione, viene preventivamente disattivata per liberare memoria
            if (istanzaHtml5QrCode && istanzaHtml5QrCode.isScanning) {
                istanzaHtml5QrCode.stop().then(() => {
                    cameraContainer.style.display = "none";
                    btnStartCamera.style.display = "block";
                    btnStopCamera.style.display = "none";
                    processaFileQRImmagine(fileImmagineSelezionato);
                });
            } else {
                processaFileQRImmagine(fileImmagineSelezionato);
            }
        });
    }

    function processaFileQRImmagine(file) {
        if (istanzaHtml5QrCode) {
            istanzaHtml5QrCode.scanFile(file, true)
                .then(decodedText => {
                    let idEstratto = decodedText.trim();
                    if (idEstratto.includes("areaId=")) {
                        const params = new URLSearchParams(idEstratto.split('?')[1]);
                        idEstratto = params.get("areaId");
                    }

                    if (mappaturaDocumentaleDVR[idEstratto]) {
                        reindirizzaADocumentoPDF(idEstratto);
                    } else {
                        alert(`QR Code rilevato nell'immagine ("${idEstratto}"), ma non associato a nessuna risorsa del DVR.`);
                    }
                })
                .catch(err => {
                    alert("Impossibile rilevare un QR Code nitido in questa immagine. Assicurati che l'inquadratura sia centrata e non mossa.");
                    console.error("Errore decodifica file d'input:", err);
                });
        }
    }
});

//------------------------------------------------------------------
// D. FUNZIONE CORE DI REINDIRIZZAMENTO ARCHITETTURALE (APERTURA PDF)
//------------------------------------------------------------------
function reindirizzaADocumentoPDF(idArea) {
    const nomeFilePDF = mappaturaDocumentaleDVR[idArea];
    if (nomeFilePDF) {
        const percorsoCompletoFile = prefissoCartellaPDF + nomeFilePDF;
        // Apre la risorsa documentale in una nuova scheda per non interrompere l'esecuzione dell'applicativo
        window.open(percorsoCompletoFile, "_blank");
    } else {
        alert("Errore di consistenza dati: risorsa PDF non configurata per l'ID richiesto.");
    }
}
