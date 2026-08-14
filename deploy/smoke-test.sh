#!/bin/bash
# smoke-test.sh - Verificación post-despliegue de la aplicación Veterinary Clinic
# Uso: ./smoke-test.sh <EC2-PUBLIC-IP>

set -u

# === Validación de parámetros ===
if [ -z "${1:-}" ]; then
    echo "Error: Se requiere la IP pública de la EC2 como parámetro."
    echo "Uso: ./smoke-test.sh <EC2-PUBLIC-IP>"
    exit 1
fi

EC2_IP="$1"
BASE_URL="http://${EC2_IP}"
PASS_COUNT=0
FAIL_COUNT=0
TOTAL_TESTS=3

echo "=== Smoke Test: Despliegue Veterinary Clinic ==="
echo "URL base: ${BASE_URL}"
echo ""

# === Función auxiliar para reportar resultado ===
report_result() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"

    if [ "$actual" = "000" ]; then
        echo "  Nombre:   ${test_name}"
        echo "  Esperado: ${expected}"
        echo "  Obtenido: Sin respuesta (timeout o servidor inalcanzable)"
        echo "  Estado:   ❌ FAIL - El endpoint no respondió"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    elif [ "$4" = "PASS" ]; then
        echo "  Nombre:   ${test_name}"
        echo "  Esperado: ${expected}"
        echo "  Obtenido: ${actual}"
        echo "  Estado:   ✅ PASS"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo "  Nombre:   ${test_name}"
        echo "  Esperado: ${expected}"
        echo "  Obtenido: ${actual}"
        echo "  Estado:   ❌ FAIL"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    echo ""
}

# === Test 1: Frontend accesible (HTTP 200 en ruta raíz) ===
echo "--- Test 1: Frontend accesible ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${BASE_URL}/" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "000" ]; then
    report_result "Frontend accesible (ruta raíz)" "200" "$HTTP_CODE" "FAIL"
elif [ "$HTTP_CODE" = "200" ]; then
    report_result "Frontend accesible (ruta raíz)" "200" "$HTTP_CODE" "PASS"
else
    report_result "Frontend accesible (ruta raíz)" "200" "$HTTP_CODE" "FAIL"
fi

# === Test 2: API Auth endpoint /api/auth/me responde 401 ===
echo "--- Test 2: API Auth endpoint ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${BASE_URL}/api/auth/me" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "000" ]; then
    report_result "API Auth endpoint (/api/auth/me)" "401" "$HTTP_CODE" "FAIL"
elif [ "$HTTP_CODE" = "401" ]; then
    report_result "API Auth endpoint (/api/auth/me)" "401" "$HTTP_CODE" "PASS"
else
    report_result "API Auth endpoint (/api/auth/me)" "401" "$HTTP_CODE" "FAIL"
fi

# === Test 3: Login endpoint responde 401 o 400 con credenciales inválidas ===
echo "--- Test 3: Login endpoint ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    -X POST "${BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "000" ]; then
    report_result "Login endpoint (/api/auth/login)" "401 o 400" "$HTTP_CODE" "FAIL"
elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "400" ]; then
    report_result "Login endpoint (/api/auth/login)" "401 o 400" "$HTTP_CODE" "PASS"
else
    report_result "Login endpoint (/api/auth/login)" "401 o 400" "$HTTP_CODE" "FAIL"
fi

# === Resumen final ===
echo "=== Resumen ==="
echo "Total: ${TOTAL_TESTS} | Pass: ${PASS_COUNT} | Fail: ${FAIL_COUNT}"
echo ""

if [ "$FAIL_COUNT" -eq 0 ]; then
    echo "✅ Todos los tests pasaron correctamente."
    exit 0
else
    echo "❌ ${FAIL_COUNT} test(s) fallaron. Revisar los resultados anteriores."
    exit 1
fi
