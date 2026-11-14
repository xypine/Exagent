{
  description = "Development environment for the prospecting workspace";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { nixpkgs, ... }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              python313
              uv
              ruff
              biome
              nodejs_22
              pnpm
              gnumake
              docker
              docker-compose
              codex
            ];
          };
        });

      apps = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          makeApp = target: {
            type = "app";
            program = toString (pkgs.writeShellScript "prospecting-${target}" ''
              export PATH=${pkgs.lib.makeBinPath [ pkgs.docker pkgs.gnumake pkgs.nodejs_22 pkgs.pnpm pkgs.ruff pkgs.uv ]}:$PATH
              exec ${pkgs.gnumake}/bin/make ${target} RUFF=${pkgs.ruff}/bin/ruff RUFF_FLAGS=--no-cache "$@"
            '');
          };
        in
        {
          check = makeApp "check";
          test = makeApp "test";
          verify = makeApp "verify";
          backend-check = makeApp "backend-check";
          backend-test = makeApp "backend-test";
          frontend-check = makeApp "frontend-check";
          frontend-test = makeApp "frontend-test";
          frontend-compose-check = makeApp "frontend-compose-check";
          frontend-compose-test = makeApp "frontend-compose-test";
          compose-config = makeApp "compose-config";
          dev = makeApp "dev";
        });
    };
}
