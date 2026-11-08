# Sourced by the scripts that write to the PRODUCTION database or API
# (parthub-db / api.parthub.autos). They used to run straight away; test
# stores ("Demo", London) and UK seed data reached production that way.
# Now the operator has to type the database name, or set
# CONFIRM_PRODUCTION=parthub-db for an intended, scripted run.
#
# Usage: source "$(dirname "$0")/_guard-production.sh" "what this script does"
guard_what="${1:-write to the production database}"
if [ "${CONFIRM_PRODUCTION:-}" != "parthub-db" ]; then
  echo "!! This script will: $guard_what"
  echo "!! Target: PRODUCTION (parthub-db / api.parthub.autos). Buyers and Google see this data."
  if [ ! -t 0 ]; then
    echo "Refused: not interactive. Set CONFIRM_PRODUCTION=parthub-db if this is really intended." >&2
    exit 1
  fi
  read -r -p "Type the database name (parthub-db) to continue: " guard_answer
  if [ "$guard_answer" != "parthub-db" ]; then
    echo "Cancelled." >&2
    exit 1
  fi
fi
