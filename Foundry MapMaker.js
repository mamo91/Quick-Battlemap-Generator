function convertRelativePointsToGlobal(anchorPoint, relativePoints) {
  const globalPoints = [];
  const anchorX = anchorPoint[0];
  const anchorY = anchorPoint[1];

  for (let i = 0; i < relativePoints.length; i += 2) {
    const x0 = relativePoints[i] + anchorX;
    const y0 = relativePoints[i + 1] + anchorY;
    globalPoints.push([x0, y0]);
  }

  return globalPoints;
}

const moduleDirectory = "modules/MapMaker/";
const terrains = {
  water: {
    color: "#0000FF",
    name: "water",
    texture: moduleDirectory+"tiles/"+"Water_tile.png",
    points: []

  },
  grass: {
    color: "#00FF00",
    name: "grass",
    texture: moduleDirectory+"tiles/"+"Grass_tile.png",
    points: []
  },
  path: {
    color: "#A0522D",
    name: "path",
    texture: moduleDirectory+"tiles/"+"Road_tile.png",
    points: []
  },
  void: {
    color: "#000000",
    name: "void",
    texture: "",
    points: []
  }
};

const terrainNames = Object.keys(terrains);

function colorSimilarity(color1, color2) {
  // Convert hex strings to RGB components
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3],  
 16)
    ] : null;
  }

  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  // Calculate Euclidean distance between RGB values
  const dr = rgb1[0] - rgb2[0];
  const dg = rgb1[1] - rgb2[1];
  const db = rgb1[2] - rgb2[2];
  const distance = Math.sqrt(dr * dr + dg * dg + db * db);

  // Normalize distance to a value between 0 and 1
  const maxDistance = Math.sqrt(255 * 255 * 3);
  const normalizedDistance = distance / maxDistance;

  // Return similarity score (1 - normalized distance)
  return 1 - normalizedDistance;
}

function terrainFromColor(color) {
  return terrainNames.toSorted((a, b) => colorSimilarity(color, terrains[b].color) - colorSimilarity(color, terrains[a].color))[0];
}

function categorizePoints(grid, categories) {
  const categorizedGrid = new Array(grid.length);
  for (let i = 0; i < grid.length; i++) {
    categorizedGrid[i] = new Array(grid[i].length);
  }

  for (let x = 0; x < grid.length; x++) {
    for (let y = 0; y < grid[x].length; y++) {
      let closestCategory = null;
      let minDistance = Infinity;
      let closestPoints = [];

      for (const tName of terrainNames) {
        let category = terrains[tName];
        for (const point of category.points) {
          const dx = point[0] - grid[x][y].x;
          const dy = point[1] - grid[x][y].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (closestPoints.length < 1) {
            closestPoints.push({ x: point[0], y: point[1], distance, category }); 
            closestPoints.sort((a, b) => a.distance - b.distance);
          } else {
            const maxDistance = closestPoints[closestPoints.length - 1].distance;
            if (distance < maxDistance) {
              for (let i = 0; i < closestPoints.length; i++) {
                if (closestPoints[i].distance > distance) {
                  closestPoints.splice(i, 1, { x: point[0], y: point[1], distance, category });
                  break;
                }
              }
            }
          }
        }
      }

      let averageCategoryDistances = [];
      for (name of terrainNames) {
        let categoryPoints = closestPoints.filter((point) => point.category.name == name);

        let averageDistance = Infinity;
        if (categoryPoints.length != 0) {
          averageDistance = categoryPoints.reduce((sum, point) => sum + point.distance * point.distance, 0) / categoryPoints.length;
        }
        averageCategoryDistances.push([name, averageDistance]);
      }
      averageCategoryDistances.sort((a, b) => a[1]-b[1]);

      grid[x][y].terrain = averageCategoryDistances[0][0];
      grid[x][y].calculatedDistances = averageCategoryDistances;
      grid[x][y].closestPoints = closestPoints;
    }
  }
  return grid;
}

function initializeGrid(sceneRect, gridScale, sceneRect) {
  //Initialize the grid to all void
  let map = new Array(sceneRect.width/gridScale);
  for (let i = 0; i < sceneRect.width/gridScale; i += 1) {
    map[i] = new Array(sceneRect.height/gridScale);
    for (let j = 0; j < sceneRect.height/gridScale; j += 1) {
      map[i][j] = {
        x: sceneRect.x+(i*gridScale), 
        y: sceneRect.y+(j*gridScale), 
        terrain: "void"
      };
    }
  }
  return map;
}

// Categorize drawings by color and add their points to the corresponding terrains
function processDrawings(terrains) {
  let d = canvas.drawings.children[0]; //<- all drawings
  for (let i = 0; i < d.children.length; i += 1) {
    let points = convertRelativePointsToGlobal([d.children[i].shape.data.x, d.children[i].shape.data.y], d.children[i].shape.data.shape.points);
    let globalPoints = points.map(point => canvas.grid.getTopLeft(point[0], point[1] ));
    let drawingTerrain = terrainFromColor(d.children[i].document.strokeColor);
    // console.log(drawingTerrain.color + " from " + d.children[i].document.strokeColor)
    terrains[drawingTerrain].points.push(...globalPoints);
  }
}
// TODO: Add some intermediate points if the bezier points are too far apart

// create tiles based on the map
function createTiles(map, terrains, gridScale) {
  let newTiles = [];
  for (let x = 0; x < map.length; x++) {
    for (let y = 0; y < map[x].length; y++) {
      let newTile = {};
      newTile.x = map[x][y].x;
      newTile.y = map[x][y].y;
      newTile.texture = {};
      newTile.texture.src = terrains[map[x][y].terrain].texture;
      // newTile.texture.tint = "#690069";
      newTile.width = gridScale;
      newTile.height = gridScale;
      newTiles.push(newTile);
    }
  }
  return newTiles;
}



// add the appropriate textures to the grid based on corners.
function autotileEdges() {

}

const moduleDirectory = "modules/MapMaker/";
const terrains = {
  water: {
    color: "#0000FF",
    name: "water",
    texture: moduleDirectory+"tiles/"+"Water_tile.png",
    points: [],
    

  },
  grass: {
    color: "#00FF00",
    name: "grass",
    texture: moduleDirectory+"tiles/"+"Grass_tile.png",
    points: []
  },
  path: {
    color: "#A0522D",
    name: "path",
    texture: moduleDirectory+"tiles/"+"Road_tile.png",
    points: []
  },
  void: {
    color: "#000000",
    name: "void",
    texture: "",
    points: []
  }
};

function main() {
  let gridScale = canvas.scene.grid.size;
  let sceneRect = canvas.scene.dimensions.sceneRect;

  //Initialize the grid to all void
  let map = initializeGrid(sceneRect, gridScale, sceneRect);
  processDrawings(terrains);
  categorizePoints(map, terrains);
  newTiles = createTiles(map, terrains, gridScale);
  return canvas.scene.createEmbeddedDocuments("Tile",newTiles);
}
main();


//TODO: Apparently also create an entire color-picking module for the drawing tool? Or recommend the boneyard one.
// game.settings.settings.get("core.defaultDrawingConfig");