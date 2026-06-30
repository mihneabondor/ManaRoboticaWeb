// ─── Build one hand (helper) ──────────────────────────────────────────────────
import * as THREE from "three";

export function buildHand(parent, side, skinMat, jointMat, palmY, placeholdersRef, lScale, sScale) {
    const mirror = side === "left" ? -1 : 1;

    // Palm block (scaled down)
    const palmGeo = new THREE.BoxGeometry(0.20 * lScale, 0.06 * lScale, 0.16 * lScale);
    const palmMesh = new THREE.Mesh(palmGeo, skinMat);
    palmMesh.castShadow = true;
    palmMesh.position.set(0, (palmY - 0.03) * lScale, 0);
    parent.add(palmMesh);
    placeholdersRef.push(palmMesh);

    const fingerJointGroups = new Map();
    const fingerSpheres = new Map();

    FINGER_DEFS.forEach(([finger, spread, xOff, proxLen, midLen, distLen, mcpR, pipR, dipR]) => {
        const mcpX = xOff * mirror * lScale;
        const mcpY = (palmY - 0.06) * lScale;
        const mcpZ = (finger === "thumb" ? 0.04 : 0.0) * lScale;

        const j0Group = new THREE.Group();
        j0Group.position.set(mcpX, mcpY, mcpZ);
        if (finger === "thumb") {
            j0Group.rotation.z = spread * mirror;
            j0Group.rotation.x = -0.55;
        } else {
            j0Group.rotation.z = spread * mirror;
        }
        parent.add(j0Group);

        const s0 = new THREE.Mesh(new THREE.SphereGeometry(mcpR * sScale, 14, 14), jointMat);
        s0.castShadow = true;
        j0Group.add(s0);

        const proxGeo = new THREE.CylinderGeometry(mcpR * 0.85 * lScale, pipR * 1.1 * lScale, proxLen * lScale, 12);
        const proxMesh = new THREE.Mesh(proxGeo, skinMat);
        proxMesh.castShadow = true;
        proxMesh.position.set(0, (-proxLen * lScale) / 2, 0);
        j0Group.add(proxMesh);
        placeholdersRef.push(proxMesh);

        const j1Group = new THREE.Group();
        j1Group.position.set(0, -proxLen * lScale, 0);
        j0Group.add(j1Group);

        const s1 = new THREE.Mesh(new THREE.SphereGeometry(pipR * sScale, 12, 12), jointMat);
        s1.castShadow = true;
        j1Group.add(s1);

        const midGeo = new THREE.CylinderGeometry(pipR * 0.9 * lScale, dipR * 1.1 * lScale, midLen * lScale, 12);
        const midMesh = new THREE.Mesh(midGeo, skinMat);
        midMesh.castShadow = true;
        midMesh.position.set(0, (-midLen * lScale) / 2, 0);
        j1Group.add(midMesh);
        placeholdersRef.push(midMesh);

        const j2Group = new THREE.Group();
        j2Group.position.set(0, -midLen * lScale, 0);
        j1Group.add(j2Group);

        const s2 = new THREE.Mesh(new THREE.SphereGeometry(dipR * sScale, 10, 10), jointMat);
        s2.castShadow = true;
        j2Group.add(s2);

        const distGeo = new THREE.CylinderGeometry(dipR * 0.9 * lScale, dipR * 0.6 * lScale, distLen * lScale, 12);
        const distMesh = new THREE.Mesh(distGeo, skinMat);
        distMesh.castShadow = true;
        distMesh.position.set(0, (-distLen * lScale) / 2, 0);
        j2Group.add(distMesh);
        placeholdersRef.push(distMesh);

        const tipGeo = new THREE.SphereGeometry(dipR * 0.62 * lScale, 10, 10);
        const tipMesh = new THREE.Mesh(tipGeo, skinMat);
        tipMesh.position.set(0, -distLen * lScale, 0);
        j2Group.add(tipMesh);
        placeholdersRef.push(tipMesh);

        const j0Key = `${side}_${finger}_j0`;
        const j1Key = `${side}_${finger}_j1`;
        const j2Key = `${side}_${finger}_j2`;

        fingerJointGroups.set(j0Key, j0Group);
        fingerJointGroups.set(j1Key, j1Group);
        fingerJointGroups.set(j2Key, j2Group);

        fingerSpheres.set(s0, j0Key);
        fingerSpheres.set(s1, j1Key);
        fingerSpheres.set(s2, j2Key);
    });

    return {fingerJointGroups, fingerSpheres};
}