# Plateforme de cours en ligne

Projet SOA base sur la meme structure que les TP: fichiers `.proto`, microservices gRPC en CommonJS, resolvers GraphQL et API Gateway Apollo.

## Structure

- `proto/tracking.proto`: contrat gRPC partage entre MS1, MS2, MS3 et Gateway.
- `ms2-tracking`: service Tracking avec RxDB, calcul de progression et producteur Kafka.
- `ms3-certification`: service Certification avec consommateur Kafka, SQLite3, generation PDF et email.
- `gateway`: schema GraphQL, resolvers gRPC et Apollo Server.

## Lancement

```bash
npm install
npm run start:tracking
npm run start:certification
npm run start:gateway
```

Ports par defaut:

- MS1 Course: `localhost:50051`
- MS2 Tracking: `localhost:50052`
- MS3 Certification: `localhost:50053`
- Gateway GraphQL: `http://localhost:3000/graphql`

## Kafka

Par defaut:

- brokers: `localhost:9092`
- topic: `tracking-events`

Variables possibles:

- `KAFKA_BROKERS`
- `KAFKA_TRACKING_TOPIC`

Kafka peut etre lance avec:

```bash
docker compose -f docker-compose.kafka.yml up -d
```

Plus de details dans `KAFKA.md`.

## Email

Le service email utilise SMTP:

- `SMTP_HOST=localhost`
- `SMTP_PORT=1025`
- `SMTP_FROM=certificats@cours.local`

Pour tester en local, un outil comme MailHog peut ecouter sur le port `1025`.
