FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["LegalService.API.csproj", "./"]
RUN dotnet restore "LegalService.API.csproj"

COPY . .
RUN dotnet publish "LegalService.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:5000;http://0.0.0.0:10000
EXPOSE 5000
EXPOSE 10000

ENTRYPOINT ["dotnet", "LegalService.API.dll"]
