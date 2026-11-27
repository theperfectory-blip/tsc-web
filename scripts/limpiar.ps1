<#
    limpiar.ps1 -- Limpieza de artefactos regenerables del proyecto TSC Web.

    Que hace:
      - Define grupos de rutas/patrones RELATIVOS a cada carpeta del proyecto
        (la raiz principal, sus tres worktrees y el proyecto tsc.web-yunacoins).
      - Sin -Borrar: solo LISTA lo que borraria, con tamano por grupo y total.
      - Con -Borrar: manda cada elemento a la PAPELERA DE RECICLAJE
        (nunca borrado definitivo, nunca Remove-Item) y pide escribir SI antes.

    Uso:
      powershell -NoProfile -File scripts\limpiar.ps1
      powershell -NoProfile -File scripts\limpiar.ps1 -Grupos builds-web,android-builds
      powershell -NoProfile -File scripts\limpiar.ps1 -Grupos apks-2.4.0 -Borrar

    Salvaguardas:
      - No sigue ni borra enlaces/junctions (comprueba ReparsePoint).
      - Rechaza cualquier ruta fuera de las carpetas permitidas.
      - Excluye siempre .git, node_modules, sandbox, _cmp, video-mejoras y las
        tareas/logs que estan en uso (LECTURAS, REGLAPLANT, LIMPIEZA, YCACTIVOS
        y las reglas comunes).
      - Un encargo solo entra si su log tiene el cierre "LISTO ..."; los que
        no lo tienen se informan como tarea en curso o incompleta.
      - Ningun grupo incluye codigo versionado del proyecto.
#>

[CmdletBinding()]
param(
    # Nombres de grupo a procesar (por defecto, todos).
    [string[]]$Grupos,

    # Si se indica, envia a la Papelera de reciclaje (pide escribir SI).
    [switch]$Borrar
)

$ErrorActionPreference = 'Stop'

# Cargar la API de VisualBasic que sabe mandar a la Papelera de reciclaje.
Add-Type -AssemblyName Microsoft.VisualBasic | Out-Null

# ---------------------------------------------------------------------------
# 1. Carpetas del proyecto (las unicas donde se permite trabajar)
# ---------------------------------------------------------------------------

$directorioScript = $PSScriptRoot                       # ...\<proyecto>\scripts
$proyectoActual   = Split-Path -Parent $directorioScript

# Si el script vive dentro de un worktree, la raiz principal es la carpeta que
# esta antes de ".claude\worktrees\<nombre>".
if ($proyectoActual -match '\\\.claude\\worktrees\\[^\\]+$') {
    $raizPrincipal = $proyectoActual -replace '\\\.claude\\worktrees\\[^\\]+$', ''
} else {
    $raizPrincipal = $proyectoActual
}

$R = @{
    main      = $raizPrincipal
    emparejar = Join-Path $raizPrincipal '.claude\worktrees\emparejar-80'
    formacion = Join-Path $raizPrincipal '.claude\worktrees\formacion-vivo'
    sweet     = Join-Path $raizPrincipal '.claude\worktrees\sweet-herschel-7fc15d'
    yunacoins = 'D:\Desktop\tsc.web-yunacoins'
}

$raicesPermitidas = @($R.main, $R.emparejar, $R.formacion, $R.sweet, $R.yunacoins)

# Etiquetas cortas para la salida.
$etiqueta = @{
    main      = 'tsc.web'
    emparejar = 'emparejar-80'
    formacion = 'formacion-vivo'
    sweet     = 'sweet-herschel'
    yunacoins = 'tsc.web-yunacoins'
}

# ---------------------------------------------------------------------------
# 2. Exclusiones fijas (nunca se tocan)
# ---------------------------------------------------------------------------

# Segmentos de ruta que jamas se recorren ni se borran.
$segmentosProhibidos = @('.git', 'node_modules', 'sandbox', '_cmp', 'video-mejoras')

# Archivos que estan en uso ahora mismo (encargos y logs activos).
$rutasProtegidas = @(
    (Join-Path $R.emparejar 'tareas\TAREA_LECTURAS.md'),
    (Join-Path $R.emparejar 'tareas\TAREA_REGLAPLANT.md'),
    (Join-Path $R.emparejar 'tareas\TAREA_LIMPIEZA.md'),
    (Join-Path $R.emparejar 'tareas\TAREA_COMUN.md'),
    (Join-Path $R.emparejar 'tareas\LECTURAS.log'),
    (Join-Path $R.emparejar 'tareas\REGLAPLANT.log'),
    (Join-Path $R.emparejar 'tareas\LIMPIEZA.log'),
    (Join-Path $R.emparejar 'tareas\TAREA_YCACTIVOS.md'),
    (Join-Path $R.emparejar 'tareas\YCACTIVOS.log'),
    (Join-Path $R.formacion 'tareas\TAREA_COMUN.md')
) | ForEach-Object { $_.ToLowerInvariant() }

# ---------------------------------------------------------------------------
# 3. Definicion de grupos (rutas/patrones relativos a cada carpeta)
# ---------------------------------------------------------------------------

$definicion = [ordered]@{

    # Salidas de los scripts de build: se regeneran con build-web / build-www.
    'builds-web' = @(
        @{ R = 'main';      P = 'dist' },
        @{ R = 'main';      P = 'www' },
        @{ R = 'emparejar'; P = 'dist' },
        @{ R = 'emparejar'; P = 'www' },
        @{ R = 'formacion'; P = 'dist' },
        @{ R = 'yunacoins'; P = 'www' }
    )

    # Salidas de Gradle: se regeneran con "npm run sync:android" + build.
    'android-builds' = @(
        @{ R = 'main';      P = 'android\app\build' },
        @{ R = 'main';      P = 'android\.gradle' },
        @{ R = 'main';      P = 'android\build' },
        @{ R = 'main';      P = 'android\capacitor-cordova-android-plugins\build' },
        @{ R = 'emparejar'; P = 'android\app\build' },
        @{ R = 'emparejar'; P = 'android\.gradle' },
        @{ R = 'emparejar'; P = 'android\build' },
        @{ R = 'emparejar'; P = 'android\capacitor-cordova-android-plugins\build' },
        @{ R = 'yunacoins'; P = 'android\app\build' },
        @{ R = 'yunacoins'; P = 'android\.gradle' },
        @{ R = 'yunacoins'; P = 'android\build' },
        @{ R = 'yunacoins'; P = 'android\capacitor-cordova-android-plugins\build' }
    )

    # Copia de www/ dentro del proyecto Android: la repone "npx cap sync".
    'android-assets-public' = @(
        @{ R = 'main';      P = 'android\app\src\main\assets\public' },
        @{ R = 'emparejar'; P = 'android\app\src\main\assets\public' },
        @{ R = 'yunacoins'; P = 'android\app\src\main\assets\public' }
    )

    # APKs locales de la release 2.4.0: ya publicada en GitHub Releases
    # (mismo tamano y SHA-256 que el asset descargable).
    'apks-2.4.0' = @(
        @{ R = 'emparejar'; P = 'tareas\out\TEAM-SUBS-CUP.apk' },
        @{ R = 'emparejar'; P = 'tareas\out\TEAM-SUBS-CUP-v2.4.0-release.apk' },
        @{ R = 'emparejar'; P = 'tareas\out\TSC-Web-2.4.0.apk' },
        @{ R = 'emparejar'; P = 'tareas\out\update.json' }
    )

    # Encargos ya cumplidos y sus logs. El resumen queda en
    # docs/limpieza/ENCARGOS-RESUMEN.md. Las tareas en uso estan protegidas.
    'encargos-cumplidos' = @(
        @{ R = 'emparejar'; P = 'tareas\TAREA_*.md' },
        @{ R = 'emparejar'; P = 'tareas\*.log' },
        @{ R = 'formacion'; P = 'tareas\TAREA_*.md' },
        @{ R = 'formacion'; P = 'tareas\*.log' },
        @{ R = 'formacion'; P = 'tareas\CANCELADA_*.md' },
        @{ R = 'formacion'; P = 'tareas\API_*.md' }
    )

    # Grafo de graphify: cache y salidas regenerables (GRAPH_REPORT.md se queda).
    'graphify-regenerable' = @(
        @{ R = 'main';      P = 'tsc-src\graphify-out\graph.html' },
        @{ R = 'main';      P = 'tsc-src\graphify-out\graph.json' },
        @{ R = 'emparejar'; P = 'tsc-src\graphify-out\cache' },
        @{ R = 'emparejar'; P = 'tsc-src\graphify-out\graph.html' },
        @{ R = 'emparejar'; P = 'tsc-src\graphify-out\graph.json' },
        @{ R = 'yunacoins'; P = 'tsc-src\graphify-out\cache' },
        @{ R = 'yunacoins'; P = 'tsc-src\graphify-out\graph.html' },
        @{ R = 'yunacoins'; P = 'tsc-src\graphify-out\graph.json' }
    )

    # Logs de los emuladores de Firebase (se reescriben solos).
    'logs-emulador' = @(
        @{ R = 'emparejar'; P = 'firebase-debug.log' },
        @{ R = 'emparejar'; P = 'firestore-debug.log' },
        @{ R = 'emparejar'; P = 'functions\firestore-debug.log' }
    )

    # Caches locales de herramientas.
    'caches-varias' = @(
        @{ R = 'main'; P = '.firebase' }
    )
}

# ---------------------------------------------------------------------------
# 4. Utilidades
# ---------------------------------------------------------------------------

# Devuelve $true si el elemento es un enlace/junction.
function Test-EsEnlace {
    param([System.IO.FileSystemInfo]$Item)
    return [bool]($Item.Attributes -band [System.IO.FileAttributes]::ReparsePoint)
}

# Recorre una carpeta sin seguir enlaces y suma tamano y numero de archivos.
function Get-Tamano {
    param([string]$Ruta, [System.IO.FileSystemInfo]$Item)

    if (-not $Item.PSIsContainer) {
        return @{ Bytes = [int64]$Item.Length; Archivos = 1 }
    }

    $bytes = [int64]0
    $archivos = 0
    $pila = New-Object System.Collections.Stack
    $pila.Push($Item.FullName)

    while ($pila.Count -gt 0) {
        $actual = $pila.Pop()
        $hijos = @(Get-ChildItem -LiteralPath $actual -Force -ErrorAction SilentlyContinue)
        foreach ($hijo in $hijos) {
            if (Test-EsEnlace -Item $hijo) { continue }   # nunca se siguen enlaces
            if ($hijo.PSIsContainer) {
                $pila.Push($hijo.FullName)
            } else {
                $bytes += $hijo.Length
                $archivos++
            }
        }
    }

    return @{ Bytes = $bytes; Archivos = $archivos }
}

# Busca enlaces dentro de una carpeta (para no borrar un arbol que los contenga).
function Test-ContieneEnlace {
    param([string]$Ruta)

    $pila = New-Object System.Collections.Stack
    $pila.Push($Ruta)
    while ($pila.Count -gt 0) {
        $actual = $pila.Pop()
        $hijos = @(Get-ChildItem -LiteralPath $actual -Force -ErrorAction SilentlyContinue)
        foreach ($hijo in $hijos) {
            if (Test-EsEnlace -Item $hijo) { return $true }
            if ($hijo.PSIsContainer) { $pila.Push($hijo.FullName) }
        }
    }
    return $false
}

# Comprueba que la ruta este dentro de alguna carpeta permitida.
function Test-DentroDePermitidas {
    param([string]$Ruta)

    $rutaNorm = [System.IO.Path]::GetFullPath($Ruta)
    foreach ($raiz in $raicesPermitidas) {
        $raizNorm = [System.IO.Path]::GetFullPath($raiz)
        if (-not $raizNorm.EndsWith('\')) { $raizNorm = $raizNorm + '\' }
        if ($rutaNorm.StartsWith($raizNorm, [System.StringComparison]::OrdinalIgnoreCase)) {
            return $true
        }
    }
    return $false
}

# Comprueba que ningun segmento de la ruta sea de una carpeta prohibida.
function Test-SegmentoProhibido {
    param([string]$Ruta)

    $partes = $Ruta.Split([char]'\')
    foreach ($parte in $partes) {
        if ($segmentosProhibidos -contains $parte) { return $true }
    }
    return $false
}

# Comprueba si el elemento es una tarea/log en uso.
function Test-Protegido {
    param([string]$Ruta)
    return ($rutasProtegidas -contains $Ruta.ToLowerInvariant())
}

# Comprueba si un log termina con la linea de cierre "LISTO ...".
# Un log sin ese cierre se considera tarea en curso o incompleta.
function Test-LogCumplido {
    param([string]$RutaLog)

    if (-not (Test-Path -LiteralPath $RutaLog)) { return $false }
    $lineas = @(Get-Content -LiteralPath $RutaLog -Encoding UTF8 -ErrorAction SilentlyContinue)
    foreach ($linea in $lineas) {
        if ($linea -match '^\s*(\*\*|`)?\s*LISTO') { return $true }
    }
    return $false
}

# Devuelve los logs que corresponden a un encargo (TAREA_XXX.md -> XXX.log).
function Get-LogsDelEncargo {
    param([string]$RutaMd)

    $carpeta = Split-Path -Parent $RutaMd
    $nombre  = Split-Path -Leaf $RutaMd
    $codigo  = $nombre -replace '^TAREA_', '' -replace '\.md$', ''

    $logs = @()
    $exacto = Join-Path $carpeta ($codigo + '.log')
    if (Test-Path -LiteralPath $exacto) {
        $logs += $exacto
    } else {
        # Casos partidos en varios logs (p. ej. BONO5 -> BONO5a.log + BONO5b.log).
        $prefijo = Join-Path $carpeta ($codigo + '*.log')
        foreach ($log in @(Get-ChildItem -Path $prefijo -Force -ErrorAction SilentlyContinue)) {
            if ($logs -notcontains $log.FullName) { $logs += $log.FullName }
        }
    }
    return $logs
}

# Decide si un elemento del grupo de encargos esta realmente terminado.
function Test-EncargoTerminado {
    param([string]$Ruta)

    $nombre = Split-Path -Leaf $Ruta

    if ($nombre -like 'CANCELADA_*') { return $true }   # cancelada a proposito
    if ($nombre -like 'API_*')       { return $true }   # contrato ya incorporado

    if ($nombre -like '*.log') {
        return (Test-LogCumplido -RutaLog $Ruta)
    }

    # Encargo en Markdown: solo si alguno de sus logs tiene cierre LISTO.
    $logs = @(Get-LogsDelEncargo -RutaMd $Ruta)
    if ($logs.Count -eq 0) { return $false }
    foreach ($log in $logs) {
        if (Test-LogCumplido -RutaLog $log) { return $true }
    }
    return $false
}

# Manda un elemento a la Papelera de reciclaje (nunca borrado definitivo).
function EnviarAPapelera {
    param([string]$Ruta, [System.IO.FileSystemInfo]$Item)

    if (Test-EsEnlace -Item $Item) {
        throw "Es un enlace/junction; no se toca."
    }

    if ($Item.PSIsContainer) {
        [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory(
            $Ruta,
            [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,
            [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)
    } else {
        [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile(
            $Ruta,
            [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,
            [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)
    }
}

# Da formato legible a un tamano en bytes.
function Format-Tamano {
    param([int64]$Bytes)
    if ($Bytes -ge 1GB) { return ('{0:N2} GB' -f ($Bytes / 1GB)) }
    if ($Bytes -ge 1MB) { return ('{0:N1} MB' -f ($Bytes / 1MB)) }
    return ('{0:N0} KB' -f ($Bytes / 1KB))
}

# Muestra una ruta de forma corta y sin confusiones (tsc.web-yunacoins no es
# un subdirectorio de tsc.web).
function Get-RutaCorta {
    param([string]$Ruta)

    $rutaYuna = [System.IO.Path]::GetFullPath($R.yunacoins)
    $rutaNorm = [System.IO.Path]::GetFullPath($Ruta)
    if ($rutaNorm.StartsWith($rutaYuna, [System.StringComparison]::OrdinalIgnoreCase)) {
        return ('[yunacoins]' + $rutaNorm.Substring($rutaYuna.Length))
    }
    $raizNorm = [System.IO.Path]::GetFullPath($raizPrincipal)
    if ($rutaNorm.StartsWith($raizNorm + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
        return ('.' + $rutaNorm.Substring($raizNorm.Length).Replace('\.claude\worktrees', ''))
    }
    return $Ruta
}

# ---------------------------------------------------------------------------
# 5. Resolucion de grupos y elementos
# ---------------------------------------------------------------------------

$nombresDisponibles = @($definicion.Keys)

if ($Grupos) {
    $desconocidos = @($Grupos | Where-Object { $nombresDisponibles -notcontains $_ })
    if ($desconocidos.Count -gt 0) {
        Write-Host ("Grupos desconocidos: {0}" -f ($desconocidos -join ', ')) -ForegroundColor Red
        Write-Host ("Grupos validos: {0}" -f ($nombresDisponibles -join ', ')) -ForegroundColor Yellow
        exit 2
    }
    $nombres = @($Grupos)
} else {
    $nombres = $nombresDisponibles
}

Write-Host ''
Write-Host 'LIMPIEZA TSC WEB' -ForegroundColor Cyan
Write-Host ('Carpetas permitidas: {0}' -f (($raicesPermitidas | ForEach-Object { Get-RutaCorta $_ }) -join ' | '))
if ($Borrar) {
    Write-Host 'MODO: BORRAR (Papelera de reciclaje)' -ForegroundColor Red
} else {
    Write-Host 'MODO: SIMULACION (no se borra nada)' -ForegroundColor Green
}
Write-Host ''

$totalBytes = [int64]0
$totalElementos = 0
$plan = @()          # elementos validados que se procesarian
$avisos = @()

foreach ($nombreGrupo in $nombres) {

    $entradas = $definicion[$nombreGrupo]
    $items = @()

    foreach ($entrada in $entradas) {
        $raiz = $R[$entrada.R]
        $patron = Join-Path $raiz $entrada.P

        $tieneComodin = [System.Management.Automation.WildcardPattern]::ContainsWildcardCharacters($entrada.P)
        if ($tieneComodin) {
            $encontrados = @(Get-ChildItem -Path $patron -Force -ErrorAction SilentlyContinue)
        } elseif (Test-Path -LiteralPath $patron) {
            $encontrados = @(Get-Item -LiteralPath $patron -Force -ErrorAction SilentlyContinue)
        } else {
            $encontrados = @()
        }

        foreach ($item in $encontrados) {
            $ruta = $item.FullName

            # Salvaguardas por elemento.
            if (-not (Test-DentroDePermitidas -Ruta $ruta)) {
                $avisos += "Fuera de las carpetas permitidas: $ruta"
                continue
            }
            if (Test-SegmentoProhibido -Ruta $ruta) {
                $avisos += "En carpeta excluida: $ruta"
                continue
            }
            if (Test-Protegido -Ruta $ruta) {
                $avisos += "Protegido (en uso): $ruta"
                continue
            }
            if ($nombreGrupo -eq 'encargos-cumplidos' -and -not (Test-EncargoTerminado -Ruta $ruta)) {
                $avisos += "Sin cierre LISTO (tarea en curso o incompleta): $ruta"
                continue
            }
            if (Test-EsEnlace -Item $item) {
                $avisos += "Es enlace/junction, no se toca: $ruta"
                continue
            }
            if ($item.PSIsContainer -and (Test-ContieneEnlace -Ruta $ruta)) {
                $avisos += "La carpeta contiene enlaces, no se toca: $ruta"
                continue
            }

            $items += $item
        }
    }

    # Quitar duplicados (un mismo elemento puede venir de dos patrones).
    $vistos = @{}
    $itemsUnicos = @()
    foreach ($item in $items) {
        $clave = $item.FullName.ToLowerInvariant()
        if (-not $vistos.ContainsKey($clave)) {
            $vistos[$clave] = $true
            $itemsUnicos += $item
        }
    }

    Write-Host ('GRUPO {0}' -f $nombreGrupo) -ForegroundColor Yellow

    if ($itemsUnicos.Count -eq 0) {
        Write-Host '  (sin elementos: ya esta limpio o las rutas no existen)'
        Write-Host ''
        continue
    }

    $bytesGrupo = [int64]0
    $archivosGrupo = 0

    foreach ($item in $itemsUnicos) {
        $tam = Get-Tamano -Ruta $item.FullName -Item $item
        $bytesGrupo += $tam.Bytes
        $archivosGrupo += $tam.Archivos
        $rel = Get-RutaCorta -Ruta $item.FullName
        Write-Host ('  [{0,9}] {1,7} arch.  {2}' -f (Format-Tamano $tam.Bytes), $tam.Archivos, $rel)
        $plan += @{ Grupo = $nombreGrupo; Ruta = $item.FullName; Item = $item; Bytes = $tam.Bytes; Archivos = $tam.Archivos }
    }

    Write-Host ('  Total grupo "{0}": {1} en {2} archivos' -f $nombreGrupo, (Format-Tamano $bytesGrupo), $archivosGrupo) -ForegroundColor Cyan
    Write-Host ''

    $totalBytes += $bytesGrupo
    $totalElementos += $itemsUnicos.Count
}

Write-Host ('TOTAL: {0} en {1} elementos' -f (Format-Tamano $totalBytes), $totalElementos) -ForegroundColor Cyan

if ($avisos.Count -gt 0) {
    Write-Host ''
    Write-Host 'AVISOS:' -ForegroundColor Yellow
    foreach ($aviso in $avisos) { Write-Host ('  - {0}' -f $aviso) }
}

# ---------------------------------------------------------------------------
# 6. Borrado (solo con -Borrar, previa confirmacion "SI")
# ---------------------------------------------------------------------------

if (-not $Borrar) {
    Write-Host ''
    Write-Host 'Simulacion terminada. No se borro nada.' -ForegroundColor Green
    exit 0
}

if ($plan.Count -eq 0) {
    Write-Host ''
    Write-Host 'No hay nada que borrar.' -ForegroundColor Green
    exit 0
}

Write-Host ''
Write-Host ('Se enviaran {0} elementos a la Papelera de reciclaje ({1}).' -f $plan.Count, (Format-Tamano $totalBytes)) -ForegroundColor Red
$respuesta = Read-Host 'Escribe SI (mayusculas) para continuar'
if ($respuesta -ne 'SI') {
    Write-Host 'Cancelado: no se borro nada.' -ForegroundColor Green
    exit 0
}

$liberado = [int64]0
$errores = 0

foreach ($elemento in $plan) {
    try {
        # Revalidar justo antes de borrar.
        if (-not (Test-Path -LiteralPath $elemento.Ruta)) { continue }
        if (-not (Test-DentroDePermitidas -Ruta $elemento.Ruta)) { throw 'ruta fuera de lo permitido' }
        if (Test-SegmentoProhibido -Ruta $elemento.Ruta) { throw 'carpeta excluida' }
        if (Test-Protegido -Ruta $elemento.Ruta) { throw 'elemento protegido' }

        $itemActual = Get-Item -LiteralPath $elemento.Ruta -Force
        EnviarAPapelera -Ruta $elemento.Ruta -Item $itemActual
        $liberado += $elemento.Bytes
        Write-Host ('  OK  {0}' -f (Get-RutaCorta -Ruta $elemento.Ruta)) -ForegroundColor DarkGray
    } catch {
        $errores++
        Write-Host ('  ERROR  {0}: {1}' -f $elemento.Ruta, $_.Exception.Message) -ForegroundColor Red
    }
}

Write-Host ''
Write-Host ('Espacio liberado: {0} en {1} elementos; errores: {2}' -f (Format-Tamano $liberado), $plan.Count, $errores) -ForegroundColor Cyan
Write-Host 'Todo lo borrado esta en la Papelera de reciclaje (se puede restaurar).' -ForegroundColor Green
