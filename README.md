# WAK-PPU-BALL ASMR Simulator

브라우저에서 왁뿌볼을 누르고 문질러 깨뜨리는 모바일 대응 3D ASMR 시뮬레이터입니다.

## 바로 실행

[GitHub Pages에서 플레이하기](https://apple77771.github.io/wakppuball-simulator/)

화면의 왁뿌볼을 길게 누르거나 드래그해 상호작용할 수 있습니다. 하단 카드에서 재질을 변경하고, 우측 상단 버튼으로 음향·진동·냉동 효과와 초기화를 제어합니다.

## 주요 기능

- Three.js 기반 실시간 3D 렌더링
- 마우스와 터치 입력 지원
- 재질별 변형·균열·파편 효과
- Web Audio 기반 상호작용 음향
- 모바일 화면과 진동 피드백 대응

## 로컬 실행

Node.js가 설치된 환경에서 다음 명령을 실행한 뒤 `http://localhost:8080`을 엽니다.

```bash
node server.js
```

별도의 빌드 과정이나 패키지 설치는 필요하지 않습니다.

## 배포

`main` 브랜치에 변경 사항을 올리면 GitHub Actions가 정적 파일을 GitHub Pages에 자동 배포합니다. 최초 1회 저장소의 `Settings > Pages`에서 배포 소스를 `GitHub Actions`로 선택해야 할 수 있습니다.

## 기술 구성

- HTML, CSS, JavaScript
- [Three.js r128](https://github.com/mrdoob/three.js/tree/r128)
- Google Fonts

## 권리와 라이선스

소스 코드와 `audio/` 음원·기타 에셋의 공개 재사용 라이선스는 아직 지정되지 않았습니다. 권리 확인 전에는 저장소 외부에서 재배포하거나 상업적으로 사용하지 마세요.
