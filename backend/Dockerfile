# syntax=docker/dockerfile:1.7
# Java 25 tags were verified during FND-003 preparation. Digests keep the build repeatable.
FROM eclipse-temurin:25-jdk-jammy@sha256:917e4ad2363fb761904f2e515237171bb6867521f03b1ab2cbf466c8ebd92399 AS build

WORKDIR /workspace

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
COPY src/ src/
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -DskipTests package && \
    cp target/kostak-backend-*.jar /workspace/application.jar

FROM eclipse-temurin:25-jre-jammy@sha256:7d1b8bf8b361b932f8c76589b963bc164e4fff416d832169f8dfe26c8aae8f50

ARG VCS_REF=unknown
ARG VERSION=dev
ARG SOURCE_URL=https://github.com/kostak-fraud/kostak-fraud-tool

LABEL org.opencontainers.image.title="kostak-fraud-backend" \
      org.opencontainers.image.description="Kostak Fraud Tool backend runtime" \
      org.opencontainers.image.source="${SOURCE_URL}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.version="${VERSION}"

RUN groupadd --system --gid 10001 kostak && \
    useradd --system --uid 10001 --gid kostak --create-home --home-dir /app --shell /usr/sbin/nologin kostak

WORKDIR /app
COPY --from=build --chown=kostak:kostak /workspace/application.jar /app/application.jar
COPY --chown=kostak:kostak --chmod=0555 worker-healthcheck.sh /app/worker-healthcheck.sh

USER 10001:10001
EXPOSE 8080

# Container-aware JVM ergonomics cap heap below the service memory limit. Override only through provider runtime configuration.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=65 -XX:InitialRAMPercentage=25 -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/urandom"

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD ["/app/worker-healthcheck.sh"]

ENTRYPOINT ["java", "-jar", "/app/application.jar"]
