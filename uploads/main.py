import sys
import json
import os
from PyQt6.QtWidgets import (QApplication, QWidget, QVBoxLayout, QLineEdit, 
                             QTextEdit, QListWidget)
from PyQt6.QtCore import Qt

# Forza il programma a posizionarsi nella cartella corretta
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class GrimorioApp(QWidget):
    def __init__(self):
        super().__init__()
        try:
            with open("incantesimi_2024.json", "r", encoding="utf-8") as f:
                self.grimorio = json.load(f)
        except:
            self.grimorio = []
        self.initUI()
        
    def initUI(self):
        self.setWindowTitle("GrimorioApp")
        self.resize(800, 700)
        
        self.setStyleSheet("""
            QWidget { background-color: #e3d5b8; color: #4b3621; font-family: 'Georgia', serif; }
            QLineEdit { 
                background-color: #fdf5e6; border: 2px solid #8b4513; 
                padding: 12px; border-radius: 10px; color: #4b3621; font-size: 18px;
            }
            QListWidget { 
                background-color: #fdf5e6; border: 1px solid #8b4513; 
                color: #4b3621; font-size: 16px; 
            }
            QTextEdit { 
                background-color: #f5ebdc; border: 2px inset #8b4513; 
                padding: 25px; border-radius: 10px; color: #2e1e0f;
                font-size: 16px; line-height: 1.6;
            }
        """)

        layout = QVBoxLayout()
        self.entry = QLineEdit()
        self.entry.setPlaceholderText("Cerca Incantesimo...")
        self.entry.textChanged.connect(self.aggiorna_suggerimenti)
        layout.addWidget(self.entry)

        self.lista_suggerimenti = QListWidget()
        self.lista_suggerimenti.setMaximumHeight(150)
        self.lista_suggerimenti.hide() 
        self.lista_suggerimenti.itemClicked.connect(self.mostra_incantesimo)
        layout.addWidget(self.lista_suggerimenti)

        self.display = QTextEdit()
        self.display.setReadOnly(True)
        self.mostra_benvenuto()
        layout.addWidget(self.display)
        
        self.setLayout(layout)

    def mostra_benvenuto(self):
        path_immagine = os.path.join(os.getcwd(), "5e24.png")
        self.display.setHtml(f"""
            <div style="text-align: center; margin-top: 50px;">
                <img src="{path_immagine}" width="250">
                <h1 style="color: #8b4513; font-size: 45px; margin-top: 10px;">GrimorioApp</h1>
                <p style="font-size: 20px;"><i>"Il sapere è la più potente delle magie."</i></p>
            </div>
        """)

    def aggiorna_suggerimenti(self, testo_digitato):
        ricerca = testo_digitato.strip().lower()
        self.lista_suggerimenti.clear()
        
        if not ricerca:
            self.lista_suggerimenti.hide()
            self.mostra_benvenuto()
            return
            
        self.display.clear() 
        
        # Logica di ricerca intelligente
        if len(ricerca) == 1:
            match = [i for i in self.grimorio if i["nome_italiano"].lower().startswith(ricerca)]
        else:
            match = [i for i in self.grimorio if ricerca in i["nome_italiano"].lower()]
        
        if match:
            for i in match:
                # Forza il minuscolo e poi capitalizza le prime lettere
                nome_pulito = i["nome_italiano"].lower().title()
                self.lista_suggerimenti.addItem(nome_pulito)
            self.lista_suggerimenti.show()
        else:
            self.lista_suggerimenti.hide()
            self.display.setHtml("<div style='text-align:center; margin-top: 150px;'><p style='font-size: 18px;'>Nessun incantesimo trovato...</p></div>")

    def mostra_incantesimo(self, item):
        # Convertiamo in minuscolo per fare un confronto sicuro
        nome_scelto = item.text().lower() 
        inc = next((i for i in self.grimorio if i["nome_italiano"].lower() == nome_scelto), None)
        
        if inc:
            # Forza il minuscolo e poi capitalizza anche per il titolo grande
            titolo_pulito = inc.get('nome_italiano', 'N/A').lower().title()
            
            testo = f"""
            <div style="text-align: justify;">
                <h1 style="color: #8b4513; margin-bottom: 10px; font-size: 32px; text-align: center;">{titolo_pulito}</h1>
                <p style="margin: 8px 0; font-size: 18px;"><b>Livello:</b> {inc.get('livello', 'N/A')}</p>
                <p style="margin: 8px 0; font-size: 18px;"><b>Tempo di lancio:</b> {inc.get('tempo_di_lancio', 'N/A')}</p>
                <p style="margin: 8px 0; font-size: 18px;"><b>Gittata:</b> {inc.get('gittata', 'N/A')}</p>
                <p style="margin: 8px 0; font-size: 18px;"><b>Componenti:</b> {inc.get('componenti', 'N/A')}</p>
                <p style="margin: 8px 0; font-size: 18px;"><b>Durata:</b> {inc.get('durata', 'N/A')}</p>
                <hr style="border: 1px solid #8b4513; margin: 20px 0;">
                <p style="font-size: 19px;"><b>Descrizione:</b><br>{inc.get('descrizione', 'N/A')}</p>
            </div>
            """
            self.display.setHtml(testo)
            self.lista_suggerimenti.hide()
            self.entry.blockSignals(True)
            self.entry.setText(titolo_pulito)
            self.entry.blockSignals(False)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    ex = GrimorioApp()
    ex.show()
    sys.exit(app.exec())