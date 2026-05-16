# Kafka

Kafka est utilise pour decoupler MS2 Tracking et MS3 Certification.

## Topic

- `tracking-events`

## Producteur

- `MS2 Tracking`
- fichier: `ms2-tracking/kafkaProducer.js`

MS2 publie un evenement apres chaque action d'etudiant:

```json
{
  "event_id": "uuid",
  "event_type": "progress.updated",
  "student_id": "student-1",
  "course_id": "course-1",
  "progress_percentage": 80,
  "completed": false,
  "created_at": "2026-05-16T10:00:00.000Z"
}
```

Quand le cours est termine, `event_type` devient:

```text
course.completed
```

## Consommateur

- `MS3 Certification`
- fichier: `ms3-certification/kafkaConsumer.js`

MS3 ecoute le topic `tracking-events`. Quand il recoit un evenement `course.completed`, il verifie les regles puis genere le certificat PDF et l'envoie par email.

## Lancement avec Docker

```bash
docker compose -f docker-compose.kafka.yml up -d
```

Verifier que Kafka tourne:

```bash
docker ps
```

Arreter Kafka:

```bash
docker compose -f docker-compose.kafka.yml down
```

## Lancement des services avec Kafka active

Terminal 1:

```bash
node ms2-tracking/trackingMicroservice.js
```

Terminal 2:

```bash
node ms3-certification/certificationMicroservice.js
```

Terminal 3:

```bash
node gateway/apiGateway.js
```

Pour tester sans Kafka:

```bash
KAFKA_ENABLED=false node ms2-tracking/trackingMicroservice.js
```

Sous PowerShell:

```powershell
$env:KAFKA_ENABLED="false"
node ms2-tracking\trackingMicroservice.js
```
