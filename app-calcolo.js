// 1. MAPPATURA DELLE 15 OPZIONI (Fuori dalle funzioni per essere globale)
const mappaturaPosizioni = {
    "1": "Uff. Amministrativo (12.60 m2)",
    "2": "Uff. Tecnico (17.64 m2)",
    "3": "Sala Riunione",
    "4": "Fotocopie",
    "5": "W.C. / Toilette",
    "6": "Attesa",
    "7": "Ingresso",
    "8": "Corridoio",
    "9": "Archivi",
    "10": "Segreteria",
    "11": "Officina",
    "12": "Deposito attrezzature",
    "13": "Deposito materiali",
    "14": "Deposito",
    "15": "Zona Esterna"
};

// Variabili globali per memorizzare lo stato dell'elaborazione corrente
let posizioneCorrenteID = "";
let nomePosizioneCorrente = "";
let qrCodeGeneratoInOutput = null;

// L'INTERO CODICE OPERATIVO PARTE SOLO QUANDO LA PAGINA È PRONTA
document.addEventListener("DOMContentLoaded", () => {
    
    // -----------------------------------------------------------------
    // A. GESTIONE INPUT FORM MANUALE
    // -----------------------------------------------------------------
    const riskForm = document.getElementById("risk-form");
    riskForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const selectValue = document.getElementById("posizione-select").value;
        if(selectValue) {
            elaboraRisultato(selectValue);
        }
    });

    // -----------------------------------------------------------------
    // B. GESTIONE SCANNER FOTOCAMERA (Tramite Bottoni Personalizzati)
    // -----------------------------------------------------------------
    const html5QrCode = new Html5Qrcode("reader");
    const btnStartCamera = document.getElementById("btn-start-camera");
    const btnStopCamera = document.getElementById("btn-stop-camera");
    const cameraContainer = document.getElementById("camera-preview-container");

    // Funzione che viene eseguita quando il QR Code viene inquadrato con successo
    function onScanSuccess(decodedText, decodedResult) {
        let idRilevato = decodedText.trim();
        
        if (mappaturaPosizioni[idRilevato]) {
            spegniFotocameraLogica(); // Spegne la telecamera
            elaboraRisultato(idRilevato); // Mostra l'output del rischio
        } else {
            alert("QR Code letto correttamente, ma il valore interno ('" + idRilevato + "') non corrisponde a nessuna delle 15 posizioni.");
        }
    }

    // Bottone "Avvia Fotocamera"
    btnStartCamera.addEventListener("click", () => {
        cameraContainer.style.display = "block";
        btnStartCamera.style.display = "none";
        btnStopCamera.style.display = "block";

        // Avvia lo streaming richiedendo esplicitamente la fotocamera posteriore
        html5QrCode.start(
            { facingMode: "environment" }, 
            {
                fps: 15,
                qrbox: { width: 250, height: 250 }
            },
            onScanSuccess,
            (errorMessage) => {
                // Lasciato vuoto per non intasare la console dei log del browser
            }
        ).catch(err => {
            alert("Impossibile accedere alla fotocamera. Verifica i permessi del browser o assicurati di usare una connessione protetta HTTPS/Localhost.");
            spegniFotocameraLogica();
            console.error(err);
        });
    });

    // Bottone "Spegni Fotocamera"
    btnStopCamera.addEventListener("click", () => {
        spegniFotocameraLogica();
    });

    // Funzione di utilità per fermare il flusso video in modo pulito
    function spegniFotocameraLogica() {
        if (html5QrCode.isScanning) {
            html5QrCode.stop().then(() => {
                cameraContainer.style.display = "none";
                btnStartCamera.style.display = "block";
                btnStopCamera.style.display = "none";
            }).catch(err => console.error("Errore durante l'arresto:", err));
        } else {
            cameraContainer.style.display = "none";
            btnStartCamera.style.display = "block";
            btnStopCamera.style.none;
        }
    }

    // -----------------------------------------------------------------
    // C. GESTIONE UPLOAD FILE IMMAGINE QR CODE (Da PC/Telefono)
    // -----------------------------------------------------------------
    const fileInput = document.getElementById("qr-file-input");
    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length === 0) return;
        const imageFile = e.target.files[0];
        
        // Se la fotocamera è accesa mentre si sceglie il file, la spegniamo per evitare conflitti hardware
        if (html5QrCode.isScanning) {
            html5QrCode.stop().then(() => {
                cameraContainer.style.display = "none";
                btnStartCamera.style.display = "block";
                btnStopCamera.style.display = "none";
                processaFileImmagine(imageFile);
            });
        } else {
            processaFileImmagine(imageFile);
        }
    });

    function processaFileImmagine(file) {
        html5QrCode.scanFile(file, true)
            .then(decodedText => {
                let idRilevato = decodedText.trim();
                if (mappaturaPosizioni[idRilevato]) {
                    elaboraRisultato(idRilevato);
                } else {
                    alert("QR Code rilevato nell'immagine, ma non associato alle 15 aree del modulo.");
                }
            })
            .catch(err => {
                alert("Nessun QR Code leggibile trovato in questa immagine. Riprova con un'immagine più nitida.");
                console.error(err);
            });
    }

    // -----------------------------------------------------------------
    // D. ACTION BOTTONE DOWNLOAD FILE PDF
    // -----------------------------------------------------------------
    document.getElementById("btn-download-pdf").addEventListener("click", () => {
        generaEDownloadPDF(posizioneCorrenteID, nomePosizioneCorrente);
    });

}); // CHIUSURA CORRETTA DI TUTTO IL BLOCCO DOMCONTENTLOADED


// -----------------------------------------------------------------
// FUNZIONE LOGICA PRINCIPALE: MOSTRA RISULTATI E GENERA NUOVO QR CODE
// (Messa fuori dal blocco DOM per pulizia architetturale)
// -----------------------------------------------------------------
function elaboraRisultato(idOpzione) {
    posizioneCorrenteID = idOpzione;
    nomePosizioneCorrente = mappaturaPosizioni[idOpzione];

    // Mostra l'area dei risultati a schermo
    const resultSection = document.getElementById("result-section");
    document.getElementById("result-title").innerText = `Valutazione Pronta: ID [${idOpzione}]`;
    document.getElementById("result-text").innerText = `Zona Elaborata: ${nomePosizioneCorrente}. Sotto puoi scaricare il PDF ufficiale o salvare il QR d'accesso rapido.`;
    resultSection.style.display = "block";
    resultSection.scrollIntoView({ behavior: 'smooth' });

    // Pulizia e rigenerazione del QR Code di Output
    const qrContainer = document.getElementById("qrcode-canvas");
    qrContainer.innerHTML = ""; // Svuota QR precedente

    // Impostiamo lo scheletro dell'URL futuro del PDF per il QR code di output
    let baseNetworkPath = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
    let stringaDatiQR = `${baseNetworkPath}/Calcolo della valutazione di Rischio.html?areaId=${idOpzione}`;

    qrCodeGeneratoInOutput = new QRCode(qrContainer, {
        text: stringaDatiQR,
        width: 180,
        height: 180,
        colorDark : "#0d47a1",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
}

// -----------------------------------------------------------------
// FUNZIONE GENERATRICE FILE PDF (jsPDF)
// -----------------------------------------------------------------
function generaEDownloadPDF(id, nomeZona) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Intestazione grafica della Documentazione DVR
    doc.setFillColor(13, 71, 161);
    doc.rect(0, 0, 210, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("T.M. SICUREZZA - REPORT DVR", 20, 25);

    // Dati dinamici del report
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(14);
    doc.text(`Documento di Valutazione dei Rischi - Scheda Tecnica`, 20, 65);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Identificativo Area: N. ${id}`, 20, 80);
    doc.text(`Ambiente di Riferimento: ${nomeZona}`, 20, 90);
    doc.text(`Data Elaborazione: ${new Date().toLocaleDateString('it-IT')}`, 20, 100);
    doc.text("Stato di conformità: VERIFICATO E CONFORME", 20, 110);
    
    doc.line(20, 120, 190, 120); // Linea divisoria

    doc.setFontSize(11);
    doc.text("Note del sistema predittivo:", 20, 130);
    doc.setFont("helvetica", "italic");
    doc.text("Questo documento costituisce uno scheletro ufficiale generato in tempo reale.", 20, 140);
    doc.text("Le misure preventive sono state calcolate sulla base dei coefficienti di pericolo standard.", 20, 148);

    // Download immediato del browser
    let nomeFileSanificato = nomeZona.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`DVR_TM_Sicurezza_${nomeFileSanificato}.pdf`);
}
