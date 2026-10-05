FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY backend/LegalService.API/LegalService.API.csproj backend/LegalService.API/
RUN dotnet restore backend/LegalService.API/LegalService.API.csproj
COPY backend/LegalService.API/ backend/LegalService.API/
RUN dotnet publish backend/LegalService.API/LegalService.API.csproj -c Release --no-restore -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish/ .
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
CMD ["sh", "-c", "exec dotnet LegalService.API.dll --urls http://0.0.0.0:${PORT:-8080}"]
