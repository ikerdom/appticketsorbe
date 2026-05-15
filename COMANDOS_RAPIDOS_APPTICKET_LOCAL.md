# COMANDOS RAPIDOS APPTICKET (LOCAL)

Ruta del proyecto:
`C:\Users\idomi\OneDrive\Documentos\EnteNova\CLOUDIA\APPTICKET`

## 1) Ir al proyecto
```powershell
Set-Location "C:\Users\idomi\OneDrive\Documentos\EnteNova\CLOUDIA\APPTICKET"
```

## 2) Setup completo (idempotente)
```powershell
Set-Location "C:\Users\idomi\OneDrive\Documentos\EnteNova\CLOUDIA\APPTICKET"; npm run setup
```

## 3) Arrancar en local (forzado a 127.0.0.1)
```powershell
Set-Location "C:\Users\idomi\OneDrive\Documentos\EnteNova\CLOUDIA\APPTICKET"; npm run dev
```

## 4) Verificar calidad
```powershell
Set-Location "C:\Users\idomi\OneDrive\Documentos\EnteNova\CLOUDIA\APPTICKET"; npm run lint
Set-Location "C:\Users\idomi\OneDrive\Documentos\EnteNova\CLOUDIA\APPTICKET"; npm run build
```

## 5) Limpiar procesos Node (si hay errores raros)
```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

## 6) Limpiar cache de Next
```powershell
Set-Location "C:\Users\idomi\OneDrive\Documentos\EnteNova\CLOUDIA\APPTICKET"; Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
```

## 7) Abrir app
```powershell
Start-Process "http://127.0.0.1:3000/login"
```

## 8) Login inicial admin (tras setup)
- Email: `iker.dominguez@entenova-gnosis.com`
- Contrasena: `6924`

## 9) Comando unico (setup + dev)
```powershell
Set-Location "C:\Users\idomi\OneDrive\Documentos\EnteNova\CLOUDIA\APPTICKET"; npm run setup; npm run dev
```
