@echo off
REM Installation de l'application de gestion de contacts
REM ==================================================

echo.
echo ============================================
echo   INSTALLATION - APPLICATION DE CONTACTS
echo ============================================
echo.

echo [1/3] Verification des dependances Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERREUR: Node.js n'est pas installe !
    echo Veuillez telecharger et installer depuis : https://nodejs.org/
    pause
    exit /b 1
)
echo OK - Node.js est installe

echo.
echo [2/3] Installation des dependances (npm install)...
call npm install
if errorlevel 1 (
    echo ERREUR: Echec de l'installation des dependances !
    pause
    exit /b 1
)
echo OK - Dependance installees avec succes

echo.
echo [3/3] Initialisation...
mkdir data\2>nul
if not exist "data\contacts.db" (
    echo OK - Dossier base de donnees initialise
)

echo.
echo ============================================
echo   INSTALLATION TERMINEE !
echo ============================================
echo.
echo Pour lancer l'application, executez :
echo     install.bat          -> Lancer en mode developpement
echo.
pause
