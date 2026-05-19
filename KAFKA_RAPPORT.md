# 📡 Rapport d'Architecture : Intégration de Kafka dans Academix

Ce document présente l'implémentation complète et l'analyse de l'architecture événementielle basée sur **Apache Kafka** dans le cadre du projet **Academix**. Cette conception permet un couplage lâche et une communication asynchrone robuste entre les différents microservices.

---

## 📋 1. Définition claire des topics Kafka

Le système repose sur **deux topics principaux**, chacun ayant une responsabilité métier précise et un flux de données unidirectionnel.

### A. Topic : `enrollment-events`
* **Producteur :** `MS1 Pedagogical`
* **Consommateur(s) :** `MS2 Tracking`
* **Rôle métier :** Transmettre les informations de nouvelle inscription. Dès qu'un étudiant s'inscrit à un cours sur le portail (MS1), cet événement notifie le service de suivi (MS2) pour qu'il initialise une fiche de progression vierge (0%).

### B. Topic : `tracking-events`
* **Producteur :** `MS2 Tracking`
* **Consommateur(s) :** `MS3 Certification`
* **Rôle métier :** Propager la progression de l'étudiant. À chaque action de l'utilisateur (vidéo regardée, quiz validé), MS2 émet un événement de mise à jour. Lorsque la progression atteint 100% ou qu'une action de complétion de cours est détectée, un événement spécifique de complétion est envoyé pour déclencher automatiquement la génération et l'envoi du certificat par MS3.

---

## ⚙️ 2. Producteurs Kafka fonctionnels

Les producteurs sont développés à l'aide de la bibliothèque **KafkaJS**. Ils se connectent au broker Kafka de manière asynchrone et gèrent la sérialisation des messages en JSON.

### A. Producteur de l'inscription (MS1)
* **Fichier d'implémentation :** `ms1-pedagogical/src/services/kafkaService.js`
* **Fonctionnement :** Dès qu'un enregistrement d'inscription est validé en base de données SQLite par le service `courseService.js`, la méthode `emitEnrollmentCreated` est appelée. Elle établit la connexion (si elle n'est pas déjà active) et envoie l'événement `ENROLLMENT_CREATED` avec l'identifiant de l'inscription comme clé de partitionnement pour garantir l'ordre de traitement.

### B. Producteur de progression & complétion (MS2)
* **Fichier d'implémentation :** `ms2-tracking/trackingResolver.js`
* **Fonctionnement :** Lorsque la méthode gRPC `RecordAction` est appelée sur le serveur MS2, le service calcule la nouvelle progression en temps réel. Il émet un message sur le topic `tracking-events` :
  - Soit un événement de mise à jour simple : `progress.updated`.
  - Soit un événement de complétion si la progression atteint 100% : `course.completed`.

---

## 📡 3. Consommateurs Kafka fonctionnels

Chaque microservice consommateur possède son propre **Group ID**, ce qui garantit que chaque service consomme les messages indépendamment à son propre rythme (principe de Publish-Subscribe).

### A. Consommateur de l'inscription (MS2)
* **Fichier d'implémentation :** `ms2-tracking/kafkaConsumer.js`
* **Group ID :** `tracking-service-enrollments`
* **Logique :** Il écoute en continu le topic `enrollment-events`. À la réception de l'événement `ENROLLMENT_CREATED`, il extrait `user_id` et `course_id` pour appeler automatiquement `trackingResolver.recordAction` avec des valeurs d'initialisation (progression à 0%).

### B. Consommateur de certification (MS3)
* **Fichier d'implémentation :** `ms3-certification/kafkaConsumer.js`
* **Group ID :** `certification-service`
* **Logique :** Il écoute en continu le topic `tracking-events`.
  - Si l'événement reçu est de type `progress.updated`, il l'ignore poliment.
  - Si l'événement est de type `course.completed`, il extrait les détails de l'étudiant et du cours pour déclencher immédiatement `certificationResolver.issueCertificate`. Cette fonction génère le PDF du certificat via **PDFKit** et envoie un email de félicitations via **Nodemailer**.

---

## 💡 4. Pertinence des événements métier utilisés

L'utilisation de Kafka dans cette architecture répond à des besoins métiers et techniques critiques :

1. **Découplage lâche (Loose Coupling) :** 
   Le microservice pédagogique (MS1) n'a aucune connaissance du fonctionnement de l'application de suivi (MS2) ou du service de certification (MS3). Il se contente de publier "Un étudiant s'est inscrit". Cela permet d'ajouter de futurs services (par exemple, un service de statistiques ou d'emails marketing) sans modifier une seule ligne de code dans MS1.
   
2. **Asynchronisme & Performance :**
   La génération de PDF et l'envoi d'emails (MS3) sont des tâches lourdes et lentes (requérant des connexions SMTP externes). Grâce à Kafka, ces traitements sont externalisés. L'utilisateur reçoit une réponse instantanée sur son application, pendant que la génération du certificat se fait en arrière-plan de manière asynchrone.

3. **Résilience et Tolérance aux pannes (Fault Tolerance) :**
   Si le service de messagerie SMTP ou la base de données de MS3 subit une panne temporaire, **le système ne perd aucun certificat**. Les messages restent stockés de manière sécurisée et persistante dans les partitions de Kafka. Dès que MS3 redémarre, il reprend la lecture là où il s'était arrêté (commit d'offsets) et traite les certificats en attente.

---

## 📝 5. Documentation des messages échangés

Voici les schémas JSON documentant précisément la structure des payloads de données échangés à travers Kafka.

### Message A : `ENROLLMENT_CREATED` (sur le topic `enrollment-events`)
Cet événement est publié par MS1 lorsqu'un étudiant s'inscrit à un cours.

```json
{
  "event": "ENROLLMENT_CREATED",
  "data": {
    "id": "7ae8590c-03d3-4903-8ad8-3f5f419b4890",
    "user_id": "usr-99",
    "course_id": "crs-101",
    "status": "active",
    "enrolled_at": "2026-05-18T22:30:00.000Z"
  },
  "timestamp": "2026-05-18T22:30:01.002Z"
}
```

### Message B : `progress.updated` (sur le topic `tracking-events`)
Publié par MS2 à chaque progression intermédiaire de l'étudiant.

```json
{
  "event_id": "evt-88bc-4aa2",
  "event_type": "progress.updated",
  "student_id": "usr-99",
  "course_id": "crs-101",
  "student_name": "Mohamed Houij",
  "student_email": "moham@example.com",
  "course_title": "Architecture des Microservices",
  "progress_percentage": 45,
  "completed": false,
  "created_at": "2026-05-18T22:45:00.000Z"
}
```

### Message C : `course.completed` (sur le topic `tracking-events`)
Publié par MS2 lorsque l'étudiant atteint 100% de progression dans un cours. Ce message déclenche l'action de certification.

```json
{
  "event_id": "evt-99df-5bb3",
  "event_type": "course.completed",
  "student_id": "usr-99",
  "course_id": "crs-101",
  "student_name": "Mohamed Houij",
  "student_email": "moham@example.com",
  "course_title": "Architecture des Microservices",
  "progress_percentage": 100,
  "completed": true,
  "created_at": "2026-05-18T23:00:00.000Z"
}
```
