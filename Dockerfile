FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src

COPY src/NursingSchool.Api/NursingSchool.Api.csproj src/NursingSchool.Api/
COPY src/NursingSchool.Application/NursingSchool.Application.csproj src/NursingSchool.Application/
COPY src/NursingSchool.Domain/NursingSchool.Domain.csproj src/NursingSchool.Domain/
COPY src/NursingSchool.Infrastructure/NursingSchool.Infrastructure.csproj src/NursingSchool.Infrastructure/

RUN dotnet restore src/NursingSchool.Api/NursingSchool.Api.csproj

COPY src/ src/

RUN dotnet publish src/NursingSchool.Api/NursingSchool.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "NursingSchool.Api.dll"]
